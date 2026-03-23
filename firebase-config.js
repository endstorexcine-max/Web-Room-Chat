// Firebase Configuration
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDbEz99vN-vWf9N4-vI_GyXMltW1MU0MHI",
    authDomain: "chatwave-3f136.firebaseapp.com",
    databaseURL: "https://chatwave-3f136-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "chatwave-3f136",
    storageBucket: "chatwave-3f136.firebasestorage.app",
    messagingSenderId: "649075826929",
    appId: "1:649075826929:web:0b47ceecb664cbcc750950"
};

// Initialize Firebase
firebase.initializeApp(FIREBASE_CONFIG);

// Global references
const database = firebase.database();
const storage = firebase.storage();

// Global variables
let currentUser = null;
let activeChatWith = null;
let activeChatId = null;
let messageListener = null;
let typingListener = null;
let typingTimeout = null;
let theme = localStorage.getItem('theme') || 'light';
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
let notificationEnabled = localStorage.getItem('notificationEnabled') === 'true';
let avatarColors = {};
let unreadCounts = {};
let allUsers = [];
let currentMessageId = null;

// Utility function untuk play sound
let playSound = new Audio("data:audio/wav;base64,U3RlYWx0aCB3YXZlIGZvciBub3RpZmljYXRpb24gc291bmQ=");

// Helper functions
function showNotification(msg) {
    const notif = document.createElement('div');
    notif.textContent = msg;
    notif.style.cssText = 'position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: var(--accent); color: white; padding: 12px 24px; border-radius: 40px; z-index: 4000; font-size: 0.9rem; box-shadow: 0 4px 12px rgba(0,0,0,0.2);';
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
}

function getAvatarLetter(name) { 
    return name ? name.charAt(0).toUpperCase() : 'U'; 
}

function getAvatarColor(username) {
    if (!avatarColors[username]) {
        const colors = ['#00a884', '#25d366', '#34b7f1', '#e91e63', '#9b59b6', '#f39c12', '#1abc9c', '#e74c3c'];
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = ((hash << 5) - hash) + username.charCodeAt(i);
            hash |= 0;
        }
        avatarColors[username] = colors[Math.abs(hash) % colors.length];
    }
    return avatarColors[username];
}

function formatTime() { 
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); 
}

function escapeHtml(text) { 
    if (!text) return ''; 
    const div = document.createElement('div'); 
    div.textContent = text; 
    return div.innerHTML; 
}

function getLastSeenText(timestamp) { 
    if (!timestamp) return 'Offline'; 
    const diff = Date.now() - timestamp; 
    const mins = Math.floor(diff/60000); 
    if (mins < 1) return 'Online'; 
    if (mins < 60) return `Last seen ${mins} min ago`; 
    const hrs = Math.floor(diff/3600000); 
    if (hrs < 24) return `Last seen ${hrs} hours ago`; 
    return `Last seen ${Math.floor(diff/86400000)} days ago`; 
}

function sendDesktopNotification(title, body) {
    if (!notificationEnabled) return;
    if (Notification.permission === "granted" && document.visibilityState !== 'visible') {
        new Notification(title, { body: body, icon: 'https://cdn-icons-png.flaticon.com/512/1345/1345878.png' });
    }
}

function closeModal() {
    document.getElementById('actionModal').style.display = 'none';
    currentMessageId = null;
}
