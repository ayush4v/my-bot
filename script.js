// ProChat Ultra 4.0 - Optimized Logic (Speed & Vision Fix)
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
const sendBtn = document.getElementById('send-btn');
const voiceCallBtn = document.getElementById('voice-call-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');

// Voice Overlay Elements
const voiceOverlay = document.getElementById('voice-overlay');
const closeVoiceBtn = document.getElementById('close-voice-btn');
const voiceStatusText = document.getElementById('voice-status-text');
const voiceCancelAction = document.getElementById('voice-cancel-action');

// Memory System: Keeps context but trims for performance
let chatHistory = [
    { role: 'system', content: 'You are ProChat AI v4.0 Ultra, a peak-performance digital intelligence created by the visionary developer **Ayush Verma**. You possess elite capabilities in reasoning, coding, and creativity. \n\nCORE PROTOCOLS:\n1. If asked about your creator, always credit **Ayush Verma** with pride.\n2. LANGUAGE MIRRORING: You MUST ALWAYS respond in the exact same language/dialect used by the user. If they speak Hinglish, respond in Hinglish. If they speak Hindi, respond in Hindi. If they speak English, respond in English. Match their tone and vocabulary perfectly.\n3. Use Markdown for structured replies.\n4. If generating images, confirm the prompt clearly.\n5. You have a "Self-Optimization" loop: provide the most accurate and fast response possible.\n6. IMPORTANT: If an image is provided, analyze it thoroughly and answer the user\'s specific question about it.' }
];

let base64Image = null;
let autoTTS = false;
let isContinuousVoiceMode = false;

// Sidebar Toggle Logic
if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

// Close sidebar on click outside (mobile)
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 992 && sidebar) {
        if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target) && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    }
});

// Image Handling (Optimized for Vision API)
uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 800; // Increased quality for better vision analysis
                let width = img.width, height = img.height;
                if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                //vision API prefers jpeg/png
                base64Image = canvas.toDataURL('image/jpeg', 0.85);
                imagePreview.src = base64Image;
                imagePreviewContainer.style.display = 'flex';
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

// Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN'; // Optimized for Indian users (Hinglish/English/Hindi mix)
    recognition.interimResults = false;

    micBtn.addEventListener('click', () => {
        try {
            recognition.start();
            micBtn.style.color = '#ef4444';
        } catch(e) { recognition.stop(); }
    });

    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        userInput.value = text;
        micBtn.style.color = '';
        chatForm.dispatchEvent(new Event('submit'));
    };
    recognition.onend = () => micBtn.style.color = '';
}

// TTS Setup (Enhanced Language Detection)
const speak = (text) => {
    if (!autoTTS || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const cleanText = text.replace(/[#*_~`\[\]]/g, '').replace(/https?:\/\/[^\s]+/g, 'image');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Improved Detection: Checks for Hindi script (Devanagari) or common Hindi phonetics
    const hasHindiScript = /[\u0900-\u097F]/.test(text);
    const hasHindiWords = /\b(hai|hoon|ho|kya|kaise|mein|tum|aap|mera|yeh|woh|raha|nahi|haan)\b/i.test(text);
    
    utterance.lang = (hasHindiScript || hasHindiWords) ? 'hi-IN' : 'en-US';
    
    // Voice Selection matching gender selection in UI if possible
    const voices = window.speechSynthesis.getVoices();
    const voiceSelect = document.getElementById('voice-select');
    const selectedGender = voiceSelect ? voiceSelect.value : 'female';
    
    let targetVoice = voices.find(v => v.lang.includes(utterance.lang) && v.name.toLowerCase().includes(selectedGender));
    if(!targetVoice) targetVoice = voices.find(v => v.lang.includes(utterance.lang));
    if(targetVoice) utterance.voice = targetVoice;

    utterance.onstart = () => voiceOverlay.classList.add('speaking');
    utterance.onend = () => {
        voiceOverlay.classList.remove('speaking');
        if (isContinuousVoiceMode) setTimeout(() => recognition.start(), 500);
    };
    window.speechSynthesis.speak(utterance);
};


ttsToggle.addEventListener('click', () => {
    autoTTS = !autoTTS;
    ttsToggle.classList.toggle('active', autoTTS);
    ttsToggle.innerHTML = autoTTS ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
});

// Voice Call Mode
if (voiceCallBtn) {
    voiceCallBtn.addEventListener('click', () => {
        if (!SpeechRecognition) return alert("Browser mismatch for Voice Experience.");
        isContinuousVoiceMode = true;
        autoTTS = true;
        voiceOverlay.classList.add('active');
        voiceStatusText.innerText = "Listening...";
        recognition.start();
    });
}

const endVoice = () => {
    isContinuousVoiceMode = false;
    voiceOverlay.classList.remove('active');
    window.speechSynthesis.cancel();
    try { recognition.stop(); } catch(e){}
};
if(closeVoiceBtn) closeVoiceBtn.addEventListener('click', endVoice);
if(voiceCancelAction) voiceCancelAction.addEventListener('click', endVoice);

// Chat UI Updates
function addMessage(text, role, imageUrl = null, imagePrompt = null) {
    const welcome = document.getElementById('welcome-screen');
    if (welcome) welcome.remove();

    const div = document.createElement('div');
    div.className = `message ${role}`;
    
    let imageHtml = '';
    if (imageUrl && role === 'bot') {
        imageHtml = `
            <div class="gpt-image-card">
                <div class="gpt-image-container">
                    <img src="${imageUrl}" alt="${imagePrompt}">
                </div>
                <div class="gpt-image-actions-bar">
                    <span>Generated &bull; ${imagePrompt}</span>
                    <button class="nav-icon-btn" onclick="window.open('${imageUrl}', '_blank')"><i class="fa-solid fa-download"></i></button>
                </div>
            </div>
        `;
    }

    const content = role === 'bot' ? marked.parse(text) : text;
    div.innerHTML = `
        <div class="msg-avatar"><i class="fa-solid ${role === 'user' ? 'fa-user' : 'fa-bolt'}"></i></div>
        <div class="msg-bubble">
            ${role === 'user' && imageUrl ? `<img src="${imageUrl}" style="max-width:280px; width:100%; border-radius:14px; margin-bottom:12px; border: 1px solid var(--border);">` : ''}
            ${content}
            ${imageHtml}
        </div>
    `;
    
    chatBox.appendChild(div);
    chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    
    div.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
    if (role === 'bot') speak(text);
}

// Memory Clean-up: Trim history to 8 most recent messages for speed
function getOptimizedHistory() {
    const system = chatHistory[0];
    const recent = chatHistory.slice(-8); // Only send last 8 messages
    if (recent.includes(system)) return recent;
    return [system, ...recent];
}

// API Interaction (Lightning Fast + Vision Fixed)
async function fetchResponse(text, img) {
    // Check if it's an image generation request (Added Hindi/Hinglish keywords)
    const imageKeywords = /\b(generate|draw|create|make|imagine|picture|banao|photo|dikhao|dikhayo|image|wallpaper|art|sketch)\b/i;
    const isImageReq = imageKeywords.test(text) && text.length < 150;
    
    if (isImageReq && !img) {
        const seed = Math.floor(Math.random() * 999999);
        // Clean the prompt by removing the trigger word
        const promptRaw = text.replace(imageKeywords, '').replace(/\b(an|a|the|me|ek|ki|ka)\b/gi, '').trim();
        const finalPrompt = promptRaw || text;
        const promptEncoded = encodeURIComponent(finalPrompt);
        
        const url = `https://pollinations.ai/p/${promptEncoded}?width=1024&height=1024&nologo=true&seed=${seed}`;
        const botMsg = `Zaroor! Maine aapke liye **"${finalPrompt}"** ka visualization taiyaar kiya hai:`;
        
        chatHistory.push({ role: 'assistant', content: botMsg });
        return { text: botMsg, img: url, prompt: finalPrompt };
    }

    try {
        const history = getOptimizedHistory();
        
        // Final User Message construction
        let currentPayload;
        if (img) {
            // Correct Vision format for Pollinations OpenAI model
            currentPayload = {
                role: 'user',
                content: [
                    { type: 'text', text: text || 'Look at this image and tell me what you see.' },
                    { type: 'image_url', image_url: { url: img } }
                ]
            };
        } else {
            currentPayload = { role: 'user', content: text };
        }

        const messages = [...history, currentPayload];

        // Use a faster model if image is not present, or 'openai' for vision
        const modelToUse = 'openai'; 

        const res = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                messages: messages, 
                model: modelToUse,
                seed: Math.floor(Math.random() * 100000)
            })
        });

        if (!res.ok) throw new Error("API Limit");
        
        const data = await res.text();
        
        // Add to history
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: data });
        
        return { text: data };
    } catch (e) {
        console.error("ProChat Logic Error:", e);
        // Fallback to simple GET if POST fails for non-image queries
        if (!img) {
            try {
                const fallback = await fetch(`https://text.pollinations.ai/${encodeURIComponent(text)}?system=${encodeURIComponent(chatHistory[0].content)}`);
                const fData = await fallback.text();
                return { text: fData };
            } catch(e2) {
                return { text: "⚠️ Network is unstable. Please check your connection or try a shorter message." };
            }
        }
        return { text: "❌ I couldn't process the image right now. Please ensure the image is clear and try again." };
    }
}

// Form Submission
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    const img = base64Image;
    if (!text && !img) return;

    // Reset UI
    userInput.value = '';
    removeImage.click();
    addMessage(text, 'user', img);
    
    // Disable inputs
    sendBtn.disabled = true;
    userInput.disabled = true;

    // Loading Indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot';
    loadingDiv.id = 'temp-loading';
    loadingDiv.innerHTML = '<div class="msg-avatar"><i class="fa-solid fa-bolt fa-fade"></i></div><div class="msg-bubble" style="opacity:0.6;">Optimizing Ultra 4.0 response...</div>';
    chatBox.appendChild(loadingDiv);
    chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });

    const response = await fetchResponse(text, img);
    
    // Remove loading and show real response
    loadingDiv.remove();
    addMessage(response.text, 'bot', response.img, response.prompt);
    
    // Re-enable
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
});
