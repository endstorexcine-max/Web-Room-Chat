// Settings Functions
async function loadUserProfile() {
    const snapshot = await database.ref('users/' + currentUser).once('value');
    const user = snapshot.val();
    if (user) {
        document.getElementById('profileName').value = user.displayName || user.username;
        document.getElementById('profileBio').value = user.bio || '';
        const letter = getAvatarLetter(user.displayName || user.username);
        document.getElementById('profileAvatar').textContent = letter;
        document.getElementById('headerAvatar').textContent = letter;
        document.getElementById('myStatusAvatar').textContent = letter;
        document.getElementById('myStatusAvatar').style.background = getAvatarColor(currentUser);
    }
}

async function saveProfile() {
    const displayName = document.getElementById('profileName').value.trim() || currentUser;
    const bio = document.getElementById('profileBio').value.trim() || '';
    await database.ref('users/' + currentUser).update({ displayName, bio });
    loadUserProfile();
    if (window.loadChats) loadChats();
    if (window.loadUsers) loadUsers();
    showNotification('Profile updated!');
}

function goToSettings() { 
    if (window.switchPage) switchPage('settings'); 
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('soundEnabled', soundEnabled);
    document.getElementById('soundStatus').textContent = soundEnabled ? 'On' : 'Off';
    showNotification(`Message sound ${soundEnabled ? 'enabled' : 'disabled'}`);
}

async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        showNotification("Browser doesn't support notifications");
        return;
    }
    if (Notification.permission === "granted") {
        notificationEnabled = true;
        localStorage.setItem('notificationEnabled', 'true');
        document.getElementById('notificationStatus').textContent = 'On';
        showNotification("Notifications enabled");
    } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        notificationEnabled = permission === "granted";
        localStorage.setItem('notificationEnabled', notificationEnabled);
        document.getElementById('notificationStatus').textContent = notificationEnabled ? 'On' : 'Off';
        if (notificationEnabled) showNotification("Notifications enabled");
    }
}

function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
        document.body.classList.add('dark');
        document.getElementById('themeToggle').classList.add('active');
    } else {
        document.body.classList.remove('dark');
        document.getElementById('themeToggle').classList.remove('active');
    }
}

function toggleLastSeen() {
    showNotification("Privacy setting coming soon");
}

function toggleProfilePhoto() {
    showNotification("Privacy setting coming soon");
}
