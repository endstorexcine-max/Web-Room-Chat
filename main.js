// Main Application - Page Navigation & Initialization

// Page Navigation
function switchPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    if (page === 'chats') {
        document.getElementById('chatsPage').classList.add('active');
        document.querySelectorAll('.nav-item')[0].classList.add('active');
        document.getElementById('headerTitle').innerHTML = 'Chats';
        if (window.loadChats) loadChats();
    } else if (page === 'users') {
        document.getElementById('usersPage').classList.add('active');
        document.querySelectorAll('.nav-item')[1].classList.add('active');
        document.getElementById('headerTitle').innerHTML = 'Users';
        if (window.loadUsers) loadUsers();
    } else if (page === 'status') {
        document.getElementById('statusPage').classList.add('active');
        document.querySelectorAll('.nav-item')[2].classList.add('active');
        document.getElementById('headerTitle').innerHTML = 'Status';
        if (window.loadStatuses) loadStatuses();
    } else if (page === 'settings') {
        document.getElementById('settingsPage').classList.add('active');
        document.querySelectorAll('.nav-item')[3].classList.add('active');
        document.getElementById('headerTitle').innerHTML = 'Settings';
        if (window.loadUserProfile) loadUserProfile();
    }
}

function filterUsers() {
    const keyword = document.getElementById('searchUsers').value.toLowerCase();
    const filtered = allUsers.filter(u => u.username.toLowerCase().includes(keyword) || (u.displayName && u.displayName.toLowerCase().includes(keyword)));
    displayUsers(filtered);
}

function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    if (users.length === 0) { 
        usersList.innerHTML = '<div class="empty-state">No users found</div>'; 
        return; 
    }
    usersList.innerHTML = users.map(u => `
        <div class="user-item" onclick="startChat('${u.username}')">
            <div class="user-avatar" style="background: ${getAvatarColor(u.username)}">${getAvatarLetter(u.displayName || u.username)}</div>
            <div class="user-info">
                <div class="user-name">${escapeHtml(u.displayName || u.username)}${u.online ? '<span class="online-dot"></span>' : ''}</div>
                <div class="user-bio">${escapeHtml(u.bio || 'No bio')}</div>
            </div>
        </div>
    `).join('');
}

async function loadUsers() {
    const snapshot = await database.ref('users').once('value');
    const users = snapshot.val() || {};
    allUsers = Object.keys(users).filter(u => u !== currentUser).map(u => ({ username: u, ...users[u] }));
    displayUsers(allUsers);
}

// Splash Screen
function showSplashAndLoad() {
    const splash = document.getElementById('splashScreen');
    const progressFill = document.getElementById('progressFill');
    const loadingText = document.getElementById('loadingText');
    const steps = [
        { progress: 20, text: 'Initializing...' },
        { progress: 40, text: 'Loading messages...' },
        { progress: 60, text: 'Syncing contacts...' },
        { progress: 80, text: 'Almost ready...' },
        { progress: 100, text: 'Welcome to WaveChat!' }
    ];
    let step = 0;
    const interval = setInterval(() => {
        if (step < steps.length) {
            progressFill.style.width = steps[step].progress + '%';
            loadingText.textContent = steps[step].text;
            step++;
        } else {
            clearInterval(interval);
            setTimeout(() => {
                splash.classList.add('hide');
                setTimeout(() => {
                    splash.style.display = 'none';
                    checkExistingUser();
                }, 500);
            }, 500);
        }
    }, 500);
}

// Event Listeners Setup
function setupEventListeners() {
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Auth buttons
    document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('registerBtn').addEventListener('click', register);
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => switchPage(item.dataset.page));
    });
    
    // Header avatar
    document.getElementById('headerAvatar').addEventListener('click', () => switchPage('settings'));
    
    // Back button
    document.getElementById('backBtn').addEventListener('click', closeChat);
    
    // Send message
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keyup', onTyping);
    
    // Media buttons
    document.getElementById('imageBtn').addEventListener('click', sendImage);
    document.getElementById('videoBtn').addEventListener('click', sendVideo);
    
    // Settings
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('notificationSetting').addEventListener('click', requestNotificationPermission);
    document.getElementById('soundSetting').addEventListener('click', toggleSound);
    document.getElementById('themeSetting').addEventListener('click', toggleTheme);
    document.getElementById('lastSeenSettingItem').addEventListener('click', toggleLastSeen);
    document.getElementById('profilePhotoSettingItem').addEventListener('click', toggleProfilePhoto);
    
    // Status
    document.getElementById('addStatusBtn').addEventListener('click', addStatus);
    document.getElementById('closeStatusViewBtn').addEventListener('click', closeStatusView);
    
    // Search
    document.getElementById('searchUsers').addEventListener('keyup', filterUsers);
    
    // Theme initialization
    if (theme === 'dark') {
        document.body.classList.add('dark');
        document.getElementById('themeToggle').classList.add('active');
    }
    
    // Sound status
    document.getElementById('soundStatus').textContent = soundEnabled ? 'On' : 'Off';
    document.getElementById('notificationStatus').textContent = notificationEnabled ? 'On' : 'Off';
    
    // Keep user online
    setInterval(() => { 
        if (currentUser) database.ref('users/' + currentUser).update({ lastSeen: Date.now() }); 
    }, 30000);
}

// Make functions globally available
window.switchPage = switchPage;
window.filterUsers = filterUsers;
window.startChat = startChat;
window.sendMessage = sendMessage;
window.handleKeyPress = handleKeyPress;
window.sendImage = sendImage;
window.sendVideo = sendVideo;
window.closeChat = closeChat;
window.loadChats = loadChats;
window.loadUsers = loadUsers;
window.loadStatuses = loadStatuses;
window.loadUserProfile = loadUserProfile;
window.saveProfile = saveProfile;
window.logout = logout;
window.addStatus = addStatus;
window.viewStatus = viewStatus;
window.closeStatusView = closeStatusView;
window.showMessageActions = showMessageActions;
window.editMessage = editMessage;
window.deleteForEveryone = deleteForEveryone;
window.closeModal = closeModal;
window.viewMedia = viewMedia;
window.onTyping = onTyping;
window.setupUnreadListener = setupUnreadListener;
window.setupMessageListener = setupMessageListener;
window.checkExistingUser = checkExistingUser;

// Initialize
showSplashAndLoad();
setupEventListeners();
