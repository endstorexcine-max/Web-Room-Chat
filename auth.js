// Admin Panel
const ADMIN_PASSWORD = "Admin@ChatWave2024";
let isAdminLoggedIn = false;
let allUsersAdmin = [];
let allGroupsAdmin = [];
let allPostsAdmin = [];
let selectedUsers = new Set();

async function adminLogin() {
    const pwd = document.getElementById('adminPassword').value;
    if (pwd !== ADMIN_PASSWORD) {
        document.getElementById('loginError').style.display = 'block';
        document.getElementById('loginError').innerText = 'Wrong password!';
        return;
    }
    isAdminLoggedIn = true;
    document.getElementById('loginPanel').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    await loadAllAdminData();
    await loadMaintenanceStatus();
}

function adminLogout() {
    isAdminLoggedIn = false;
    document.getElementById('loginPanel').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}

async function loadMaintenanceStatus() {
    const snap = await database.ref('admin/maintenance').once('value');
    const isOn = snap.val() === true;
    const toggle = document.getElementById('maintenanceToggle');
    const status = document.getElementById('maintenanceStatus');
    if (isOn) {
        toggle.classList.add('active');
        status.innerText = 'On';
    } else {
        toggle.classList.remove('active');
        status.innerText = 'Off';
    }
}

async function toggleMaintenance() {
    const snap = await database.ref('admin/maintenance').once('value');
    const current = snap.val() === true;
    await database.ref('admin/maintenance').set(!current);
    await loadMaintenanceStatus();
    showNotification(`Maintenance mode ${!current ? 'ON' : 'OFF'}`);
}

async function loadAllAdminData() {
    await loadAdminUsers();
    await loadAdminGroups();
    await loadAdminPosts();
    await updateAdminStats();
}

async function loadAdminUsers() {
    const snap = await database.ref('users').once('value');
    const users = snap.val() || {};
    allUsersAdmin = Object.keys(users).map(u => ({ username: u, ...users[u] }));
    renderAdminUsers();
}

function renderAdminUsers() {
    const keyword = document.getElementById('searchUsers')?.value.toLowerCase() || '';
    const filtered = allUsersAdmin.filter(u => u.username.toLowerCase().includes(keyword) || (u.displayName && u.displayName.toLowerCase().includes(keyword)));
    const container = document.getElementById('adminUsersTab');
    if (!container) return;
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">No users found</div>';
        return;
    }
    container.innerHTML = `
        <div class="mass-actions" id="massActions" style="display: ${selectedUsers.size > 0 ? 'flex' : 'none'}">
            <span>${selectedUsers.size} users selected</span>
            <button class="btn-warning" onclick="massBanUsers()">Ban Selected</button>
            <button class="btn-danger" onclick="massDeleteUsers()">Delete Selected</button>
            <button class="btn-warning" onclick="clearSelection()">Clear</button>
            <button class="btn-warning" onclick="selectAllUsers()">Select All</button>
        </div>
        <div class="search-bar"><input type="text" id="searchUsers" placeholder="Search users..." onkeyup="renderAdminUsers()"></div>
        ${filtered.map(u => `
            <div class="user-card">
                <input type="checkbox" class="checkbox-select" data-username="${u.username}" onchange="toggleSelectUser('${u.username}')" ${selectedUsers.has(u.username) ? 'checked' : ''}>
                <div class="user-info">
                    <strong>${escapeHtml(u.displayName || u.username)}</strong> @${u.username}<br>
                    <small>📞 ${u.phone || 'No phone'} | ${u.online ? '🟢 Online' : '⚫ Offline'}</small>
                    ${u.banned ? '<span class="badge-banned">BANNED</span>' : ''}
                </div>
                <div class="user-actions">
                    ${!u.banned ? `<button class="btn-warning" onclick="banUser('${u.username}')">Ban</button>` : `<button class="btn-warning" onclick="unbanUser('${u.username}')">Unban</button>`}
                    <button class="btn-danger" onclick="deleteUser('${u.username}')">Delete</button>
                </div>
            </div>
        `).join('')}
    `;
}

function toggleSelectUser(username) {
    if (selectedUsers.has(username)) selectedUsers.delete(username);
    else selectedUsers.add(username);
    renderAdminUsers();
}

function selectAllUsers() {
    allUsersAdmin.forEach(u => selectedUsers.add(u.username));
    renderAdminUsers();
}

function clearSelection() { selectedUsers.clear(); renderAdminUsers(); }

async function massBanUsers() {
    if (selectedUsers.size === 0) return;
    if (!confirm(`Ban ${selectedUsers.size} user(s)?`)) return;
    for (const username of selectedUsers) await database.ref('users/' + username).update({ banned: true });
    selectedUsers.clear();
    await loadAdminUsers();
    showNotification(`${selectedUsers.size} users banned!`);
}

async function massDeleteUsers() {
    if (selectedUsers.size === 0) return;
    if (!confirm(`⚠️ PERMANENT: Delete ${selectedUsers.size} user(s)?`)) return;
    for (const username of selectedUsers) {
        await database.ref('users/' + username).remove();
        const user = allUsersAdmin.find(u => u.username === username);
        if (user && user.phone) await database.ref('phones/' + user.phone).remove();
    }
    selectedUsers.clear();
    await loadAdminUsers();
    showNotification(`Users deleted!`);
}

async function banUser(username) {
    if (!confirm(`Ban user ${username}?`)) return;
    await database.ref('users/' + username).update({ banned: true });
    await loadAdminUsers();
    showNotification(`User ${username} banned!`);
}

async function unbanUser(username) {
    await database.ref('users/' + username).update({ banned: false });
    await loadAdminUsers();
    showNotification(`User ${username} unbanned!`);
}

async function deleteUser(username) {
    if (!confirm(`⚠️ Delete user ${username}?`)) return;
    await database.ref('users/' + username).remove();
    await loadAdminUsers();
    showNotification(`User ${username} deleted!`);
}

async function loadAdminGroups() {
    const snap = await database.ref('groups').once('value');
    const groups = snap.val() || {};
    allGroupsAdmin = Object.keys(groups).map(id => ({ id, ...groups[id] }));
    renderAdminGroups();
}

function renderAdminGroups() {
    const container = document.getElementById('adminGroupsTab');
    if (!container) return;
    if (allGroupsAdmin.length === 0) {
        container.innerHTML = '<div class="empty-state">No groups found</div>';
        return;
    }
    container.innerHTML = allGroupsAdmin.map(g => `
        <div class="group-card">
            <div class="group-info">
                <strong>${escapeHtml(g.name)}</strong><br>
                <small>👥 ${Object.keys(g.members || {}).length} members | Admin: ${g.admin}</small>
                ${g.banned ? '<span class="badge-banned">BANNED</span>' : ''}
            </div>
            <div class="user-actions">
                ${!g.banned ? `<button class="btn-warning" onclick="banGroup('${g.id}')">Ban Group</button>` : `<button class="btn-warning" onclick="unbanGroup('${g.id}')">Unban</button>`}
                <button class="btn-danger" onclick="deleteGroup('${g.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

async function banGroup(groupId) {
    if (!confirm(`Ban group?`)) return;
    await database.ref(`groups/${groupId}`).update({ banned: true });
    await loadAdminGroups();
    showNotification(`Group banned!`);
}

async function unbanGroup(groupId) {
    await database.ref(`groups/${groupId}`).update({ banned: false });
    await loadAdminGroups();
    showNotification(`Group unbanned!`);
}

async function deleteGroup(groupId) {
    if (!confirm(`⚠️ Delete group?`)) return;
    await database.ref(`groups/${groupId}`).remove();
    await loadAdminGroups();
    showNotification(`Group deleted!`);
}

async function loadAdminPosts() {
    const snap = await database.ref('posts').once('value');
    const posts = snap.val() || {};
    allPostsAdmin = Object.entries(posts).map(([id, p]) => ({ id, ...p })).sort((a,b) => b.timestamp - a.timestamp);
    renderAdminPosts();
}

function renderAdminPosts() {
    const container = document.getElementById('adminPostsTab');
    if (!container) return;
    if (allPostsAdmin.length === 0) {
        container.innerHTML = '<div class="empty-state">No posts found</div>';
        return;
    }
    container.innerHTML = allPostsAdmin.map(p => `
        <div class="post-card-admin">
            <div>
                <strong>${escapeHtml(p.author)}</strong><br>
                <small>${new Date(p.timestamp).toLocaleString()}</small>
                <p style="margin-top: 8px;">${escapeHtml(p.text)}</p>
                <small>❤️ ${p.likeCount || 0} likes | 💬 ${Object.keys(p.comments || {}).length} comments</small>
            </div>
            <button class="btn-danger" onclick="deletePost('${p.id}')">Delete</button>
        </div>
    `).join('');
}

async function deletePost(postId) {
    if (!confirm(`Delete this post?`)) return;
    await database.ref(`posts/${postId}`).remove();
    await loadAdminPosts();
    showNotification(`Post deleted!`);
}

async function updateAdminStats() {
    const totalUsers = allUsersAdmin.length;
    const totalGroups = allGroupsAdmin.length;
    const totalPosts = allPostsAdmin.length;
    const bannedUsers = allUsersAdmin.filter(u => u.banned).length;
    const statsContainer = document.getElementById('adminStats');
    statsContainer.innerHTML = `
        <div class="admin-stat-card"><div class="admin-stat-number">${totalUsers}</div><div>Total Users</div></div>
        <div class="admin-stat-card"><div class="admin-stat-number">${totalGroups}</div><div>Total Groups</div></div>
        <div class="admin-stat-card"><div class="admin-stat-number">${totalPosts}</div><div>Total Posts</div></div>
        <div class="admin-stat-card"><div class="admin-stat-number">${bannedUsers}</div><div>Banned Users</div></div>
    `;
}

function switchAdminTab(tab) {
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (tab === 'users') {
        tabs[0].classList.add('active');
        document.getElementById('adminUsersTab').style.display = 'block';
        document.getElementById('adminGroupsTab').style.display = 'none';
        document.getElementById('adminPostsTab').style.display = 'none';
        renderAdminUsers();
    } else if (tab === 'groups') {
        tabs[1].classList.add('active');
        document.getElementById('adminUsersTab').style.display = 'none';
        document.getElementById('adminGroupsTab').style.display = 'block';
        document.getElementById('adminPostsTab').style.display = 'none';
        renderAdminGroups();
    } else {
        tabs[2].classList.add('active');
        document.getElementById('adminUsersTab').style.display = 'none';
        document.getElementById('adminGroupsTab').style.display = 'none';
        document.getElementById('adminPostsTab').style.display = 'block';
        renderAdminPosts();
    }
}

function showNotification(msg) {
    let n = document.getElementById('adminNotif');
    if (n) n.remove();
    n = document.createElement('div');
    n.id = 'adminNotif';
    n.innerHTML = msg;
    n.style.cssText = `position:fixed;bottom:20px;right:20px;background:#1da1f2;color:white;padding:10px 20px;border-radius:8px;z-index:1000;`;
    document.body.appendChild(n);
    setTimeout(() => { if (n) n.remove(); }, 3000);
}

function escapeHtml(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
