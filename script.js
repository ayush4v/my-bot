// Core ProChat Ultra 4.0 Logic
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

let chatHistory = [
    { role: 'system', content: 'You are ProChat AI v4.0 Ultra, a peak-performance digital intelligence created by the visionary developer **Ayush Verma**. You possess elite capabilities in reasoning, coding, and creativity. \n\nCORE PROTOCOLS:\n1. If asked about your creator, always credit **Ayush Verma** with pride.\n2. Respond in the user\'s language (Hinglish/English/Hindi).\n3. Use Markdown for structured replies.\n4. If generating images, confirm the prompt clearly.\n5. You have a "Self-Optimization" loop: provide the most accurate and fast response possible.' }
];

let base64Image = null;
let autoTTS = false;
let isContinuousVoiceMode = false;
let lastImageContext = null;

// Sidebar Toggle Logic
if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

// Close sidebar on click outside (mobile)
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 992) {
        if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target) && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    }
});

// Image Handling
uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 512;
                let width = img.width, height = img.height;
                if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                base64Image = canvas.toDataURL('image/jpeg', 0.8);
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

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN';
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

// TTS Setup
const speak = (text) => {
    if (!autoTTS || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[#*_~`\[\]]/g, '').replace(/https?:\/\/[^\s]+/g, 'image');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = /[\u0900-\u097F]/.test(text) ? 'hi-IN' : 'en-US';
    
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
    if (imageUrl) {
        imageHtml = `
            <div class="gpt-image-card">
                <div class="gpt-image-container">
                    <img src="${imageUrl}" alt="${imagePrompt}">
                </div>
                <div class="gpt-image-actions-bar">
                    <span>${imagePrompt}</span>
                    <button class="nav-icon-btn" onclick="window.open('${imageUrl}', '_blank')"><i class="fa-solid fa-download"></i></button>
                </div>
            </div>
        `;
    }

    const content = role === 'bot' ? marked.parse(text) : text;
    div.innerHTML = `
        <div class="msg-avatar"><i class="fa-solid ${role === 'user' ? 'fa-user' : 'fa-bolt'}"></i></div>
        <div class="msg-bubble">
            ${role === 'user' && imageUrl ? `<img src="${imageUrl}" style="max-width:200px; border-radius:10px; margin-bottom:10px;"><br>` : ''}
            ${content}
            ${imageHtml}
        </div>
    `;
    
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    div.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
    if (role === 'bot') speak(text);
}

// API Interaction
async function fetchResponse(text, img) {
    const isImageReq = /\b(generate|draw|create|make|imagine)\b/i.test(text) && text.length < 100;
    
    if (isImageReq && !img) {
        const seed = Math.floor(Math.random() * 100000);
        const prompt = encodeURIComponent(text.replace(/\b(generate|draw|create|make|imagine)\b/i, '').trim());
        const url = `https://pollinations.ai/p/${prompt}?width=1024&height=1024&nologo=true&seed=${seed}`;
        return { text: `Creating your artwork for: **${decodeURIComponent(prompt)}**`, img: url, prompt: decodeURIComponent(prompt) };
    }

    try {
        const messages = [...chatHistory];
        if (img) {
            messages.push({ role: 'user', content: [{ type: 'text', text: text || 'Analyze this' }, { type: 'image_url', image_url: { url: img } }] });
        } else {
            messages.push({ role: 'user', content: text });
        }

        const res = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, model: 'openai' })
        });
        const data = await res.text();
        chatHistory.push({ role: 'assistant', content: data });
        return { text: data };
    } catch (e) {
        return { text: "Connection error. Please check your internet and try again." };
    }
}

// Form Submission
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    const img = base64Image;
    if (!text && !img) return;

    userInput.value = '';
    removeImage.click();
    addMessage(text, 'user', img);
    
    sendBtn.disabled = true;
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot';
    loadingDiv.innerHTML = '<div class="msg-avatar"><i class="fa-solid fa-spinner fa-spin"></i></div><div class="msg-bubble">Thinking...</div>';
    chatBox.appendChild(loadingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    const response = await fetchResponse(text, img);
    loadingDiv.remove();
    addMessage(response.text, 'bot', response.img, response.prompt);
    sendBtn.disabled = false;
});
