const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('file-input');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImage = document.getElementById('remove-image');
const micBtn = document.getElementById('mic-btn');
const ttsToggle = document.getElementById('tts-toggle');
const sendBtn = document.querySelector('.send-btn');
const voiceCallBtn = document.getElementById('voice-call-btn');

// Fullscreen Voice Overlay Elements 
const voiceOverlay = document.getElementById('voice-overlay');
const closeVoiceBtn = document.getElementById('close-voice-btn');
const voiceStatusText = document.getElementById('voice-status-text');
const voiceCancelAction = document.getElementById('voice-cancel-action');

const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.querySelector('.sidebar');
const themeToggle = document.getElementById('theme-toggle');

// Create overlay for mobile sidebar
const overlay = document.createElement('div');
overlay.className = 'sidebar-overlay';
document.body.appendChild(overlay);

let chatHistory = [
    { role: 'system', content: 'You are ProChat AI v4.0 Ultra, a peak-performance digital intelligence created by the visionary developer **Ayush Verma**. You possess elite capabilities in reasoning, coding, and creativity. \n\nCORE PROTOCOLS:\n1. If asked about your creator, always credit **Ayush Verma** with pride.\n2. Respond in the user\'s language (Hinglish/English/Hindi).\n3. Use Markdown for structured replies.\n4. If generating images, confirm the prompt clearly.\n5. You have a "Self-Optimization" loop: provide the most accurate and fast response possible.' }
];

// Session-based Learning Database
const AI_SYSTEM_MEMORY = {
    failed_attempts: 0,
    successful_patterns: [],
    self_fix_active: false
};

let base64Image = null;
let autoTTS = false; // Auto read aloud disabled by default
let isContinuousVoiceMode = false;
let silentRetries = 0;
let lastGeneratedImageContext = null; // Memory of what was just drawn

// Global helper for image retries to avoid quoting issues in HTML templates
window.handleImageError = function(imgEl) {
    let retryCount = parseInt(imgEl.getAttribute('data-retry') || '0');
    const ldr = imgEl.parentElement.querySelector('.img-loader-spinner');
    
    if (retryCount < 2) {
        imgEl.setAttribute('data-retry', retryCount + 1);
        const urlParts = imgEl.src.split('?');
        const baseUrl = urlParts[0];
        const newSeed = Math.floor(Math.random() * 1000000);
        
        // Slightly modify the prompt to bypass cache and try again
        imgEl.src = baseUrl + '?width=1024&height=1024&nologo=true&seed=' + newSeed;
    } else {
        if (ldr) ldr.style.display = 'none';
        imgEl.style.display = 'none';
        imgEl.parentElement.innerHTML = `
            <div class='image-error-ui' style='padding:40px; text-align:center; color:#ececec; width:100%; height:400px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#1e1e1e;'>
                <i class='fa-solid fa-triangle-exclamation fa-3x' style='color:#ef4444; margin-bottom:15px;'></i>
                <span style='font-size:1.1rem; font-weight:500;'>Generation Failed (Server Busy)</span>
                <p style='color:var(--text-secondary); font-size:0.9rem; margin:10px 0 20px;'>Our AI artist is taking a break. Please try again in 30 seconds.</p>
                <button onclick='location.reload()' style='background:#10a37f; color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:600;'>
                    <i class='fa-solid fa-rotate-right'></i> Refresh App
                </button>
            </div>`;
    }
};

// Image Generation Logic (Pollinations Image URL)
const isImageGenerationPrompt = (text) => {
    const triggerWords = ['generate', 'draw', 'create', 'picture', 'photo', 'imagine', 'kheecho', 'banao', 'tasveer', 'image', 'show me', 'paint', 'sketch', 'illustrate'];
    const lowerText = text.toLowerCase();
    return triggerWords.some(word => lowerText.includes(word)) && lowerText.length < 500;
};

// Toggle TTS
ttsToggle.addEventListener('click', () => {
    autoTTS = !autoTTS;
    ttsToggle.classList.toggle('active', autoTTS);
    ttsToggle.innerHTML = autoTTS ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
    if (!autoTTS && window.speechSynthesis) window.speechSynthesis.cancel();
});

// Image Upload Handling
uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Resize image to max 512x512 to prevent API payload too large errors
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 512;
                let width = img.width;
                let height = img.height;
                if (width > height && width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                } else if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Get compressed base64
                base64Image = canvas.toDataURL('image/jpeg', 0.8);
                
                imagePreview.src = base64Image;
                imagePreviewContainer.style.display = 'block';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

removeImage.addEventListener('click', () => {
    base64Image = null;
    fileInput.value = '';
    imagePreviewContainer.style.display = 'none';
});

// Voice Input (Speech to Text)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognitionInstance = null;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognitionInstance = recognition;
    recognition.continuous = true; // True for real-time stream processing
    recognition.interimResults = true; // Need interim chunks for custom silence timers
    recognition.lang = 'en-IN'; // Uses Indian English to cleanly transcribe both full English and Hinglish words perfectly

    let speechSilenceTimer = null;
    let initialSilenceTimer = null;

    micBtn.addEventListener('click', () => {
        if (micBtn.classList.contains('recording')) {
            recognition.stop();
        } else {
            if(window.speechSynthesis) window.speechSynthesis.cancel();
            recognition.start();
        }
    });

    recognition.onstart = () => {
        if(!isContinuousVoiceMode) micBtn.classList.add('recording');
        userInput.placeholder = isContinuousVoiceMode ? "Listening... (You can speak)" : "Aapki awaaz sun raha hoon...";
        userInput.value = ""; // Clear on fresh start
        
        clearTimeout(speechSilenceTimer);
        clearTimeout(initialSilenceTimer);

        if(isContinuousVoiceMode) {
            voiceStatusText.innerHTML = "Listening...";
            // ChatGPT initial silence timeout: If no speech detected in 6 seconds, abort.
            initialSilenceTimer = setTimeout(() => {
                recognition.stop();
            }, 6000);
        }
    };

    recognition.onresult = (event) => {
        silentRetries = 0;
        clearTimeout(initialSilenceTimer); // User started speaking
        clearTimeout(speechSilenceTimer);
        
        // Combine real-time interim results
        let combinedText = Array.from(event.results)
                                .map(res => res[0].transcript)
                                .join('');
                                
        userInput.value = combinedText;
        
        if(isContinuousVoiceMode && combinedText.trim()) {
            voiceStatusText.innerHTML = `"${combinedText}"`;
        }

        // ChatGPT-style fast cut-off (1.5 seconds of silence after a word)
        if (combinedText.trim().length > 0) {
            speechSilenceTimer = setTimeout(() => {
                recognition.stop(); // Force rapid evaluation & submission
            }, 1500); 
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        clearTimeout(speechSilenceTimer);
        clearTimeout(initialSilenceTimer);
        
        if (!isContinuousVoiceMode) {
            userInput.placeholder = "Message ProChat AI...";
            micBtn.classList.remove('recording');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
            setTimeout(() => { if (isContinuousVoiceMode) { try { recognition.start(); } catch(e){} } }, 500);
        }
    };

    recognition.onend = () => {
        clearTimeout(speechSilenceTimer);
        clearTimeout(initialSilenceTimer);
        
        micBtn.classList.remove('recording');
        userInput.placeholder = "Message ProChat AI...";
        if (userInput.value.trim().length > 0) {
            chatForm.dispatchEvent(new Event('submit'));
        } else if (isContinuousVoiceMode) {
            silentRetries++;
            if (silentRetries === 1) {
                speakText("I didn't quite catch that. Could you please repeat?");
            } else if (silentRetries >= 2) {
                isContinuousVoiceMode = false;
                speakText("It seems you aren't speaking. I'll end the call for now.");
                setTimeout(() => { if (!isContinuousVoiceMode) endVoiceCall(); }, 4000);
            } else {
                setTimeout(() => { if (isContinuousVoiceMode) { try { recognition.start(); } catch(e){} } }, 500);
            }
        }
    };
} else {
    micBtn.style.display = 'none'; // Not supported in this browser
}

// Common function to end voice call mode
const endVoiceCall = () => {
    isContinuousVoiceMode = false;
    voiceCallBtn.classList.remove('active');
    voiceCallBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="10" width="3" height="4" rx="1.5"/><rect x="9" y="6" width="3" height="12" rx="1.5"/><rect x="15" y="4" width="3" height="16" rx="1.5"/><rect x="21" y="8" width="3" height="8" rx="1.5"/></svg>';
    try { recognitionInstance.stop(); } catch(e) {}
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    
    // Hide UI
    voiceOverlay.classList.remove('active');
    voiceOverlay.classList.remove('speaking');
};

// Bind UI Close buttons for Fullscreen Voice Mode
if(closeVoiceBtn) closeVoiceBtn.addEventListener('click', endVoiceCall);
if(voiceCancelAction) voiceCancelAction.addEventListener('click', endVoiceCall);


// Mobile Sidebar Toggle Logic
if(menuToggle) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });
}

overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
});

// Theme Toggle Logic
if(themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.style.getPropertyValue('--bg-main') !== '#f5f5f5';
        if (isDark) {
            document.documentElement.style.setProperty('--bg-main', '#f5f5f5');
            document.documentElement.style.setProperty('--bg-sidebar', '#ffffff');
            document.documentElement.style.setProperty('--text-primary', '#1a1a1a');
            document.documentElement.style.setProperty('--border', '#e0e0e0');
            document.documentElement.style.setProperty('--msg-user', '#f0f0f0');
            themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            document.documentElement.style.setProperty('--bg-main', '#0a0a0a');
            document.documentElement.style.setProperty('--bg-sidebar', '#121212');
            document.documentElement.style.setProperty('--text-primary', '#fcfcfc');
            document.documentElement.style.setProperty('--border', '#2a2a2a');
            document.documentElement.style.setProperty('--msg-user', '#1f1f1f');
            themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    });
}

if (voiceCallBtn) {
    voiceCallBtn.addEventListener('click', () => {
        if (!SpeechRecognition) return alert("Browser does not support Voice Recognition.");
        
        if (isContinuousVoiceMode) {
            endVoiceCall();
        } else {
            isContinuousVoiceMode = true;
            silentRetries = 0;
            autoTTS = true; 
            ttsToggle.classList.add('active'); // Voice mode requires TTS
            ttsToggle.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            voiceCallBtn.classList.add('active');
            voiceCallBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
                // Speak invisible string to UNLOCK browser TTS engine for future responses
                let unlockUtterance = new SpeechSynthesisUtterance('');
                unlockUtterance.volume = 0;
                window.speechSynthesis.speak(unlockUtterance);
            }
            
            // Show new UI Overlay 
            voiceOverlay.classList.add('active');
            voiceStatusText.innerHTML = "Listening...";
            
            // Play a soft ChatGPT-style "bloop" sound using AudioContext
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.start(audioCtx.currentTime);
                oscillator.stop(audioCtx.currentTime + 0.15);
            } catch(e) { }

            setTimeout(() => { try { recognitionInstance.start(); } catch(e){} }, 200);
        }
    });
}

// Voice Output (Text to Speech)
const speakText = (text) => {
    if (!autoTTS || !window.speechSynthesis) return;
    
    // Clean markdown and URLs before speaking
    const cleanText = text.replace(/[#*_~`\[\]]/g, '')
                          .replace(/https?:\/\/[^\s]+/g, 'image')
                          .replace(/!image/g, '');
    
    // Auto-detect Language Based on Text Content (English vs Hindi/Hinglish)
    // Simple heuristic: If it contains common Hindi/Hinglish words or Devanagari script
    const isHindi = /[\u0900-\u097F]|(hai|hoon|ho|kya|kaise|main|tum|aap|mera|yeh|woh|karna|raha|nahi|haan|bhi)/i.test(cleanText);
    const targetLang = isHindi ? 'hi-IN' : 'en-US';

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = targetLang; 
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
        if(isContinuousVoiceMode) {
            voiceOverlay.classList.add('speaking');
            voiceStatusText.innerHTML = "Speaking...";
        }
    };

    utterance.onend = () => {
        // Automatically start listening again if in active Voice Call mode
        if (isContinuousVoiceMode && recognitionInstance) {
            voiceOverlay.classList.remove('speaking');
            voiceStatusText.innerHTML = "Listening...";
            try { recognitionInstance.start(); } catch(e) {}
        }
    };

    // Use a female/male voice contextually based on User Selection in UI
    const voices = window.speechSynthesis.getVoices();
    const voiceSelect = document.getElementById('voice-select');
    const selectedGender = voiceSelect ? voiceSelect.value : 'female';
    
    // Select voices matching the detected language
    let preferredVoices = voices.filter(v => v.lang.includes(targetLang) || v.lang.includes(targetLang.split('-')[0]));
    
    // If no exact language match, fallback to just any Indian/US voice
    if(preferredVoices.length === 0) {
        preferredVoices = voices.filter(v => 
            v.lang.includes('hi') || v.lang.includes('en-IN') || v.lang.includes('en-US') || v.lang.includes('en-GB')
        );
    }
    if(preferredVoices.length === 0) preferredVoices = voices;

    let targetVoice;
    if (selectedGender === 'male') {
        // Find Microsoft Ravi, Hemant, Guy, David, Mark, Male
        targetVoice = preferredVoices.find(v => v.name.toLowerCase().match(/male|ravi|hemant|guy|david|mark|arthur/));
    } else {
        // Find Microsoft Heera, Kalpana, Zira, Hazel, Female, Girl
        targetVoice = preferredVoices.find(v => v.name.toLowerCase().match(/female|heera|kalpana|girl|zira|hazel|susan/));
    }
    
    // Default Fallback
    if (!targetVoice) targetVoice = preferredVoices[0] || voices[0];
    
    if (targetVoice) utterance.voice = targetVoice;

    window.speechSynthesis.speak(utterance);
};

// Ensure voices are loaded
if(window.speechSynthesis) window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();


// Chat UI updating
function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addUserMessage(message, imgData) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', 'user');

    let html = `<div class="msg-avatar"><i class="fa-solid fa-user"></i></div><div class="msg-bubble">`;
    if (imgData) {
        html += `<img src="${imgData}"><br>`;
    }
    if (message) {
        html += message;
    }
    html += `</div>`;
    
    msgDiv.innerHTML = html;
    chatBox.appendChild(msgDiv);
    scrollToBottom();
}

window.downloadImage = async function(url, filename) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const objUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(objUrl);
    } catch (err) {
        window.open(url, '_blank');
    }
};

function addBotMessage(text, isTemporary = false, imageUrl = null, imagePrompt = null) {
    if (document.getElementById('typing-indicator')) {
        document.getElementById('typing-indicator').remove();
    }

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', 'bot');
    if (isTemporary) msgDiv.id = 'typing-indicator';

    let formattedText = typeof marked !== 'undefined' ? marked.parse(text) : text;
    
    let imageHTML = '';
    let currentImageId = null;

    if (imageUrl) {
        currentImageId = 'img-' + Date.now();
        imageHTML = `
        <div class="gpt-image-card">
            <div class="gpt-image-header">
                Image created &bull; <span style="text-transform:capitalize;">${imagePrompt || 'Generated image'}</span>
            </div>
            <div class="gpt-image-container" style="background: #252525; min-height: 400px; display: flex; align-items: center; justify-content: center; position: relative; border-radius: 12px; overflow: hidden; border: 1px solid var(--border);">
                <div class="img-loader-spinner" style="position:absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index:0;">
                    <i class="fa-solid fa-circle-notch fa-spin fa-3x" style="color: #10a37f;"></i>
                </div>
                <img src="${imageUrl}" alt="AI Generated Artwork" id="${currentImageId}"
                     data-retry="0"
                     onload="const ldr = this.parentElement.querySelector('.img-loader-spinner'); if(ldr) ldr.style.display='none'; this.style.opacity=1; this.style.height='auto';" 
                     onerror="window.handleImageError(this)"
                     style="opacity:0; transition: opacity 0.8s; width: 100%; height: 400px; object-fit: cover; display: block; z-index: 1;">
            </div>
            <div class="gpt-image-actions-bar">
                <div class="action-group-left">
                    <button class="icon-btn" title="Copy"><i class="fa-regular fa-copy"></i></button>
                    <button class="icon-btn" title="Share"><i class="fa-solid fa-arrow-up-from-bracket"></i></button>
                    <button class="icon-btn" title="More"><i class="fa-solid fa-ellipsis"></i></button>
                </div>
                <div class="action-group-right">
                    <button class="icon-btn download-btn-circle" onclick="downloadImage('${imageUrl}', 'aimage.jpg')" title="Download Image"><i class="fa-solid fa-arrow-down"></i></button>
                </div>
            </div>
        </div>`;
    }

    msgDiv.innerHTML = `
        <div class="msg-avatar"><i class="fa-solid fa-bolt"></i></div>
        <div class="msg-bubble">
            ${formattedText}
            ${imageHTML}
        </div>
    `;

    chatBox.appendChild(msgDiv);

    // After appending, start a safety timer for the image IF it exists
    if (imageUrl && currentImageId) {
        setTimeout(() => {
            const imgEl = document.getElementById(currentImageId);
            if (imgEl && imgEl.style.opacity === "0") {
                const loader = imgEl.parentElement.querySelector('.img-loader-spinner');
                if(loader) loader.style.display = 'none';
                imgEl.onerror();
            }
        }, 20000); 
    }
    
    // Highlight code blocks
    msgDiv.querySelectorAll('pre code').forEach((block) => {
        if (typeof hljs !== 'undefined') hljs.highlightElement(block);
    });
    
    scrollToBottom();
}

async function getApiResponse(text, imageBase64) {
    let payloadMessage;
    
    if (imageBase64) {
        // Multi-modal Vision API payload format
        payloadMessage = {
            role: "user",
            content: [
                { type: "text", text: text || "Analyze this image for me." },
                { type: "image_url", image_url: { url: imageBase64 } }
            ]
        };
    } else {
        payloadMessage = { role: "user", content: text };
    }

    chatHistory.push(payloadMessage);
    
    // Short-Circuit Image Generation to avoid polluting the Text LLM's brain
    if (isImageGenerationPrompt(text) && !imageBase64) {
        // Robust cleaning: remove common phrases
        const cleanPattern = /\b(generate|draw|create|show|paint|sketch|illustrate|imagine|make)\s+(an?|the|some)?\s*(image|picture|photo|painting|task|portrait|sketch|chitra|tasveer)?\s*(of|about|for)?\b/gi;
        let imagePrompt = text.replace(cleanPattern, '').trim();
        if (!imagePrompt) imagePrompt = text;

        const seed = Math.floor(Math.random() * 999999);
        const enhancedPrompt = `${imagePrompt}, hyper-realistic, 8k, photorealistic, cinematic lighting, masterpiece, sharp focus`;
        const promptForUrl = encodeURIComponent(enhancedPrompt);
        
        let generatedImageUrl = `https://pollinations.ai/p/${promptForUrl}?width=1024&height=1024&nologo=true&seed=${seed}`;
        
        lastGeneratedImageContext = imagePrompt;
        let botText = `Sure, I've created an image of **${imagePrompt}** for you:`;
        
        chatHistory.push({ role: "assistant", content: botText });
        return { botText, generatedImageUrl, imagePrompt };
    }

    let messagesToSend = [...chatHistory];
    
    // Dynamically force the AI to remember the exact image on screen
    if (lastGeneratedImageContext) {
        messagesToSend.push({
            role: "system",
            content: `CRITICAL SYSTEM NOTIFICATION: You have just generated and displayed a picture of "${lastGeneratedImageContext}" on the user's screen. If the user asks "what is this", "describe it", or refers to the image, they are asking about the ${lastGeneratedImageContext} image. You MUST confidently describe it and acknowledge that it's the image you generated. Ignore any previous outdated topics.`
        });
    }

    let botText = "";
    let generatedImageUrl = null;
    let imagePrompt = null;
    let maxRetries = 2;
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
        try {
            if (i > 0) {
                const indicator = document.getElementById('typing-indicator');
                if (indicator) {
                    const bubble = indicator.querySelector('.msg-bubble');
                    if (bubble) bubble.innerHTML = `<i class='fa-solid fa-microchip fa-bubble-spin'></i> AI Self-Correction Mode: Retrying fast...`;
                }
                AI_SYSTEM_MEMORY.self_fix_active = true;
                AI_SYSTEM_MEMORY.failed_attempts++;
            }

            // Turbo Optimization: Unified model for best performance
            const modelToUse = i === 0 ? 'openai' : 'mistral'; // openai is usually faster and more reliable
            
            // Limit history to 10 messages for speed
            const optimizedMessages = messagesToSend.slice(-10);

            let apiUrl = `https://text.pollinations.ai/${encodeURIComponent(optimizedMessages[optimizedMessages.length-1].content)}?model=${modelToUse}&system=${encodeURIComponent(chatHistory[0].content)}`;
            
            // Try POST first, then fallback to GET for ultimate speed
            const response = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: optimizedMessages,
                    model: modelToUse,
                    seed: Math.floor(Math.random() * 1000000)
                })
            });

            if (!response.ok) throw new Error(`API Error ${response.status}`);
            
            botText = await response.text();
            
            try {
                const parsed = JSON.parse(botText);
                if (parsed && typeof parsed === 'object') {
                    botText = parsed.content || parsed.reasoning_content || parsed.choices?.[0]?.message?.content || botText;
                }
            } catch (e) {}

            botText = botText.replace(/!\[.*?\]\(.*?\)/g, ''); // Clean hallucinated images
            
            if (i > 0) AI_SYSTEM_MEMORY.self_fix_active = false; 
            
            chatHistory.push({ role: "assistant", content: botText });
            return { botText, generatedImageUrl, imagePrompt };

        } catch (error) {
            console.warn(`[Fast-Retry] Attempt ${i+1} failed:`, error);
            lastError = error;
            await new Promise(r => setTimeout(r, 300)); // Faster retry
        }
    }

    // If we reach here, all retries failed
    console.error("All text API retries failed:", lastError);
    botText = "❌ I'm currently experiencing some connection issues. Please try again in 1 minute.";

    // Final Fallback for images
    if (isImageGenerationPrompt(text) && !imageBase64) {
        const cleanPattern = /\b(generate|draw|create|show|paint|sketch|illustrate|imagine|make)\s+(an?|the|some)?\s*(image|picture|photo|painting|task|portrait|sketch|chitra|tasveer)?\s*(of|about|for)?\b/gi;
        imagePrompt = text.replace(cleanPattern, '').trim() || text;
        const seed = Math.floor(Math.random() * 999999);
        const promptForUrl = encodeURIComponent(imagePrompt + ", high quality, masterwork");
        generatedImageUrl = `https://pollinations.ai/p/${promptForUrl}?width=1024&height=1024&nologo=true&seed=${seed}`;
        botText = `I've generated the image for you: **${imagePrompt}**`;
        chatHistory.push({ role: "assistant", content: botText });
    }
    
    return { botText, generatedImageUrl, imagePrompt };
}

// Submit Handling
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = userInput.value.trim();
    const currentImage = base64Image;
    
    if (!message && !currentImage) return;

    // Output UI User
    addUserMessage(message, currentImage);
    
    // Remove Welcome Screen if it exists
    const welcomeScreen = document.getElementById('welcome-screen');
    if (welcomeScreen) welcomeScreen.remove();
    
    // Reset Inputs
    userInput.value = '';
    removeImage.click();
    sendBtn.disabled = true;

    // Show indicator
    let loadingText = "Thinking...";
    if (isImageGenerationPrompt(message)) {
        loadingText = "Generating image...";
    } else if (currentImage) {
        loadingText = "Analyzing image...";
    }
    addBotMessage(`<i class='fa-solid fa-circle-notch fa-spin'></i> ${loadingText}`, true);

    const response = await getApiResponse(message, currentImage);
    
    // Remove loading and show real response
    addBotMessage(response.botText, false, response.generatedImageUrl, response.imagePrompt);
    
    // Auto Voice TTS
    speakText(response.botText);
    
    sendBtn.disabled = false;
});
