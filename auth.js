// Authentication Functions
function switchTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));
    if (tab === 'login') {
        tabs[0].classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        tabs[1].classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }
}

function validateUsernameOnlyLetters(username) { 
    return /^[A-Za-z]{8,}$/.test(username); 
}

function validatePhone(phone) { 
    return /^[0-9]{10,15}$/.test(phone); 
}

function validatePassword(password) { 
    return password && password.length >= 8 && /\d/.test(password); 
}

async function register() {
    const username = document.getElementById('regUsername').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;
    const errorEl = document.getElementById('regError');

    if (!validateUsernameOnlyLetters(username)) {
        errorEl.textContent = 'Username hanya huruf, min 8 karakter!';
        errorEl.style.display = 'block';
        return;
    }
    if (!validatePhone(phone)) {
        errorEl.textContent = 'Nomor telepon tidak valid!';
        errorEl.style.display = 'block';
        return;
    }
    if (!validatePassword(password)) {
        errorEl.textContent = 'Password min 8 karakter + angka!';
        errorEl.style.display = 'block';
        return;
    }
    if (password !== confirm) {
        errorEl.textContent = 'Password tidak cocok!';
        errorEl.style.display = 'block';
        return;
    }

    const exists = await database.ref('users/' + username).once('value');
    if (exists.exists()) {
        errorEl.textContent = 'Username sudah terdaftar!';
        errorEl.style.display = 'block';
        return;
    }

    const phoneExists = await database.ref('phones/' + phone).once('value');
    if (phoneExists.exists()) {
        errorEl.textContent = 'Nomor telepon sudah terdaftar!';
        errorEl.style.display = 'block';
        return;
    }

    await database.ref('users/' + username).set({
        username, phone, password, displayName: username, bio: 'Hello! I am using WaveChat',
        createdAt: Date.now(), online: true, lastSeen: Date.now()
    });
    await database.ref('phones/' + phone).set(username);

    errorEl.style.display = 'none';
    switchTab('login');
    document.getElementById('loginUsername').value = username;
    showNotification('Akun berhasil dibuat! Silakan login.');
}

async function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    if (!validateUsernameOnlyLetters(username)) {
        errorEl.textContent = 'Username hanya huruf, min 8 karakter!';
        errorEl.style.display = 'block';
        return;
    }

    const snapshot = await database.ref('users/' + username).once('value');
    const user = snapshot.val();

    if (!user || user.password !== password) {
        errorEl.textContent = 'Username atau password salah';
        errorEl.style.display = 'block';
        return;
    }

    currentUser = username;
    localStorage.setItem('currentUser', username);
    await database.ref('users/' + username).update({ online: true, lastSeen: Date.now() });

    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    
    setupPresenceListener();
    if (window.loadUserProfile) loadUserProfile();
    if (window.loadChats) loadChats();
    if (window.loadUsers) loadUsers();
    if (window.loadStatuses) loadStatuses();
    if (window.setupUnreadListener) setupUnreadListener();
    if (window.setupMessageListener) setupMessageListener();
    
    showNotification(`Welcome ${user.displayName || username}!`);
}

async function logout() {
    if (currentUser) await database.ref('users/' + currentUser).update({ online: false, lastSeen: Date.now() });
    if (messageListener) messageListener();
    if (typingListener) typingListener();
    if (window.closeChat) closeChat();
    currentUser = null;
    localStorage.removeItem('currentUser');
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    showNotification('Logged out');
}

function setupPresenceListener() { 
    database.ref('users/' + currentUser).onDisconnect().update({ online: false, lastSeen: Date.now() }); 
}

async function checkExistingUser() {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
        const snap = await database.ref('users/' + saved).once('value');
        if (snap.exists()) {
            currentUser = saved;
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('appContainer').style.display = 'flex';
            setupPresenceListener();
            if (window.loadUserProfile) loadUserProfile();
            if (window.loadChats) loadChats();
            if (window.loadUsers) loadUsers();
            if (window.loadStatuses) loadStatuses();
            if (window.setupUnreadListener) setupUnreadListener();
            if (window.setupMessageListener) setupMessageListener();
            await database.ref('users/' + currentUser).update({ online: true, lastSeen: Date.now() });
            return true;
        }
    }
    document.getElementById('loginModal').style.display = 'flex';
    return false;
}
