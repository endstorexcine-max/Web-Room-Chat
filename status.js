// Status Functions
async function addStatus() {
    const choice = confirm('Post image or video status?\nOK = Image, Cancel = Video');
    if (choice) {
        const input = document.getElementById('statusImageInput');
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            showNotification('Uploading status...');
            const ref = storage.ref(`status/${currentUser}/${Date.now()}_${file.name}`);
            await ref.put(file);
            const url = await ref.getDownloadURL();
            await database.ref(`status/${currentUser}`).set({
                type: 'image', url, time: Date.now(), expires: Date.now() + 24*60*60*1000
            });
            if (window.loadStatuses) loadStatuses();
            showNotification('Status posted!');
        };
        input.click();
    } else {
        const input = document.getElementById('statusVideoInput');
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 10*1024*1024) { showNotification('Video too large (max 10MB)'); return; }
            showNotification('Uploading status...');
            const ref = storage.ref(`status/${currentUser}/${Date.now()}_${file.name}`);
            await ref.put(file);
            const url = await ref.getDownloadURL();
            await database.ref(`status/${currentUser}`).set({
                type: 'video', url, time: Date.now(), expires: Date.now() + 24*60*60*1000
            });
            if (window.loadStatuses) loadStatuses();
            showNotification('Status posted!');
        };
        input.click();
    }
}

async function loadStatuses() {
    const statusList = document.getElementById('statusList');
    const snapshot = await database.ref('status').once('value');
    const all = snapshot.val() || {};
    const now = Date.now();
    const valid = [];
    for (const [user, s] of Object.entries(all)) {
        if (s && s.expires && s.expires > now && user !== currentUser) {
            const uSnap = await database.ref('users/' + user).once('value');
            const u = uSnap.val();
            valid.push({ username: user, displayName: u?.displayName || user, ...s });
        }
    }
    if (valid.length === 0) { 
        statusList.innerHTML = '<div class="empty-state">No status updates</div>'; 
    } else {
        statusList.innerHTML = valid.map(s => `
            <div class="status-item" onclick="viewStatus('${s.url}','${s.type}')">
                <div class="status-avatar" style="background:${getAvatarColor(s.username)}">${getAvatarLetter(s.displayName)}</div>
                <div class="status-info">
                    <div class="status-name">${escapeHtml(s.displayName)}</div>
                    <div class="status-time">${new Date(s.time).toLocaleString()}</div>
                </div>
            </div>
        `).join('');
    }
    
    const my = all[currentUser];
    if (my && my.expires > now) {
        document.getElementById('myStatusText').textContent = 'View my status';
        document.getElementById('myStatusAvatar').style.border = '2px solid var(--status-ring)';
    } else {
        document.getElementById('myStatusText').textContent = 'Tap to add status update';
        document.getElementById('myStatusAvatar').style.border = 'none';
    }
}

function viewStatus(url, type) {
    const view = document.getElementById('statusView');
    const img = document.getElementById('statusImage');
    const video = document.getElementById('statusVideo');
    img.style.display = 'none'; 
    video.style.display = 'none';
    if (type === 'image') { 
        img.src = url; 
        img.style.display = 'block'; 
    } else { 
        video.src = url; 
        video.style.display = 'block'; 
    }
    view.classList.add('active');
}

function closeStatusView() {
    document.getElementById('statusView').classList.remove('active');
    document.getElementById('statusImage').src = '';
    document.getElementById('statusVideo').src = '';
}
