// DOM Elements
const agentContainer = document.getElementById('agentContainer');
const agentHeader = document.getElementById('agentHeader');
const agentAvatar = document.getElementById('agentAvatar');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const agentMinimized = document.getElementById('agentMinimized');
const opacitySlider = document.getElementById('opacitySlider');
const sizeSlider = document.getElementById('sizeSlider');
const themeSelect = document.getElementById('themeSelect');
const avatarOptions = document.querySelectorAll('.avatar-option');

// State variables
let isDragging = false;
let offsetX = 0;
let offsetY = 0;
let isMinimized = false;
let isSettingsOpen = false;
let currentTheme = 'dark';
let currentAvatar = 'robot';
let isThinking = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Position the agent in the bottom right corner
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const containerWidth = agentContainer.offsetWidth;
    const containerHeight = agentContainer.offsetHeight;
    
    agentContainer.style.position = 'fixed';
    agentContainer.style.bottom = '20px';
    agentContainer.style.right = '20px';
    
    // Apply initial settings
    applyOpacity(opacitySlider.value);
    applySize(sizeSlider.value);
    applyTheme(themeSelect.value);
    
    // Scroll chat to bottom
    scrollChatToBottom();
});

// Draggable functionality
agentHeader.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - agentContainer.getBoundingClientRect().left;
    offsetY = e.clientY - agentContainer.getBoundingClientRect().top;
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    
    // Keep the agent within viewport bounds
    const maxX = window.innerWidth - agentContainer.offsetWidth;
    const maxY = window.innerHeight - agentContainer.offsetHeight;
    
    const boundedX = Math.max(0, Math.min(x, maxX));
    const boundedY = Math.max(0, Math.min(y, maxY));
    
    agentContainer.style.left = boundedX + 'px';
    agentContainer.style.top = boundedY + 'px';
    agentContainer.style.right = 'auto';
    agentContainer.style.bottom = 'auto';
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

// Chat functionality
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add user message to chat
    addMessage(message, 'user');
    chatInput.value = '';
    
    // Show thinking animation
    showThinking();
    
    // Simulate agent response after a delay
    setTimeout(() => {
        const responses = [
            "I'll help you with that right away!",
            "Let me process that request...",
            "I'm analyzing your request now.",
            "Here's what I found for you.",
            "I can definitely assist with that task.",
            "I've completed the requested operation.",
            "Would you like me to provide more details?",
            "Is there anything else you'd like me to help with?"
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addMessage(randomResponse, 'agent');
        hideThinking();
    }, 1500);
}

function addMessage(content, sender) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = time;
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);
    
    chatMessages.appendChild(messageDiv);
    scrollChatToBottom();
}

function scrollChatToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showThinking() {
    isThinking = true;
    agentAvatar.querySelector('.avatar-animation').style.display = 'flex';
}

function hideThinking() {
    isThinking = false;
    agentAvatar.querySelector('.avatar-animation').style.display = 'none';
}

// Minimize/Maximize functionality
minimizeBtn.addEventListener('click', toggleMinimize);
agentMinimized.addEventListener('click', toggleMinimize);

function toggleMinimize() {
    isMinimized = !isMinimized;
    
    if (isMinimized) {
        agentContainer.style.display = 'none';
        agentMinimized.style.display = 'flex';
    } else {
        agentContainer.style.display = 'flex';
        agentMinimized.style.display = 'none';
    }
}

// Close functionality
closeBtn.addEventListener('click', () => {
    agentContainer.style.display = 'none';
    agentMinimized.style.display = 'none';
    
    // In a real app, this might minimize to system tray instead
    setTimeout(() => {
        agentMinimized.style.display = 'flex';
    }, 1000);
});

// Settings functionality
settingsBtn.addEventListener('click', toggleSettings);
closeSettings.addEventListener('click', toggleSettings);

function toggleSettings() {
    isSettingsOpen = !isSettingsOpen;
    
    if (isSettingsOpen) {
        settingsPanel.classList.add('active');
        settingsPanel.style.right = '0';
    } else {
        settingsPanel.classList.remove('active');
        settingsPanel.style.right = '-300px';
    }
}

// Settings controls
opacitySlider.addEventListener('input', (e) => {
    applyOpacity(e.target.value);
});

sizeSlider.addEventListener('input', (e) => {
    applySize(e.target.value);
});

themeSelect.addEventListener('change', (e) => {
    applyTheme(e.target.value);
});

avatarOptions.forEach(option => {
    option.addEventListener('click', () => {
        // Remove selected class from all options
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        // Add selected class to clicked option
        option.classList.add('selected');
        
        // Update avatar
        const icon = option.querySelector('i').className.split(' ')[1];
        const avatarIcon = agentAvatar.querySelector('.avatar-circle i');
        avatarIcon.className = `fas ${icon}`;
        
        // Update minimized avatar
        const minimizedIcon = agentMinimized.querySelector('.minimized-avatar i');
        minimizedIcon.className = `fas ${icon}`;
    });
});

// Apply settings functions
function applyOpacity(value) {
    agentContainer.style.opacity = value / 100;
}

function applySize(value) {
    const scale = value / 100;
    agentContainer.style.transform = `scale(${scale})`;
}

function applyTheme(theme) {
    currentTheme = theme;
    
    // In a real app, this would apply different CSS variables
    // For this prototype, we'll just log the theme change
    console.log(`Theme changed to: ${theme}`);
}

// Voice input simulation
voiceBtn.addEventListener('click', () => {
    voiceBtn.classList.add('active');
    voiceBtn.innerHTML = '<i class="fas fa-circle"></i>';
    
    // Simulate voice recording
    setTimeout(() => {
        voiceBtn.classList.remove('active');
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        
        // Simulate transcribed text
        chatInput.value = "Schedule a meeting for tomorrow at 2 PM";
    }, 2000);
});

// Window resize handling
window.addEventListener('resize', () => {
    // Keep the agent within viewport bounds when window is resized
    const maxX = window.innerWidth - agentContainer.offsetWidth;
    const maxY = window.innerHeight - agentContainer.offsetHeight;
    
    const currentX = parseInt(agentContainer.style.left) || 0;
    const currentY = parseInt(agentContainer.style.top) || 0;
    
    if (currentX > maxX) {
        agentContainer.style.left = maxX + 'px';
    }
    
    if (currentY > maxY) {
        agentContainer.style.top = maxY + 'px';
    }
});

// Quick action buttons functionality
const actionButtons = document.querySelectorAll('.action-btn');
actionButtons.forEach(button => {
    button.addEventListener('click', () => {
        const action = button.getAttribute('title');
        addMessage(`You clicked: ${action}`, 'user');
        
        showThinking();
        
        setTimeout(() => {
            addMessage(`I'll help you with ${action.toLowerCase()}. What would you like to do?`, 'agent');
            hideThinking();
        }, 1000);
    });
});