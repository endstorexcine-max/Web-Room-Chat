// Chat Functions
async function loadChats() {
    const chatsList = document.getElementById('chatsList');
    const messagesSnapshot = await database.ref('messages').once('value');
    const allMessages = messagesSnapshot.val() || {};
    const chatPartners = new Set();
    const lastMessages = {};
    
    for (const [chatId, messages] of Object.entries(allMessages)) {
        if (chatId && chatId.includes('_')) {
            const parts = chatId.split('_');
            if (parts.length === 2) {
                const other = parts[0] === currentUser ? parts[1] : parts[0];
                if (other && other !== currentUser) {
                    chatPartners.add(other);
                    if (messages) {
                        const msgArray = Object.values(messages).filter(m => m && m.timestamp);
                        if (msgArray.length) {
                            lastMessages[other] = msgArray.sort((a,b) => (b.timestamp||0) - (a.timestamp||0))[0];
                        }
                    }
                }
            }
        }
    }
    
    if (chatPartners.size === 0) { 
        chatsList.innerHTML = '<div class="empty-state">No chats yet. Search users to start chatting!</div>'; 
        return; 
    }
    
    const usersSnapshot = await database.ref('users').once('value');
    const users = usersSnapshot.val() || {};
    const chats = [];
    for (const partner of chatPartners) {
        const user = users[partner] || { displayName: partner, bio: '', online: false };
        const last = lastMessages[partner];
        let lastText = '';
        if (last) lastText = last.type === 'text' ? last.text : (last.type === 'image' ? '📷 Image' : '🎥 Video');
        chats.push({ username: partner, displayName: user.displayName || partner, lastMessage: lastText, online: user.online || false, unread: unreadCounts[partner] || 0 });
    }
    
    chats.sort((a,b) => (b.unread - a.unread));
    
    chatsList.innerHTML = chats.map(chat => `
        <div class="chat-item" onclick="startChat('${chat.username}')">
            <div class="chat-avatar" style="background: ${getAvatarColor(chat.username)}">${getAvatarLetter(chat.displayName)}</div>
            <div class="chat-info">
                <div class="chat-name">${escapeHtml(chat.displayName)}${chat.online ? '<span class="online-dot"></span>' : ''}${chat.unread > 0 ? `<span class="unread-badge">${chat.unread}</span>` : ''}</div>
                <div class="chat-preview">${escapeHtml(chat.lastMessage || 'Tap to start chatting')}</div>
            </div>
        </div>
    `).join('');
}

function refChat() {
    location.reload();
}

async function startChat(otherUser) {
    activeChatWith = otherUser;
    activeChatId = [currentUser, otherUser].sort().join('_');
    
    const userSnapshot = await database.ref('users/' + otherUser).once('value');
    const user = userSnapshot.val() || {};
    document.getElementById('chatRoomName').textContent = user.displayName || otherUser;
    document.getElementById('chatRoomStatus').innerHTML = user.online ? 'Online' : getLastSeenText(user.lastSeen);
    document.getElementById('chatRoomAvatar').textContent = getAvatarLetter(user.displayName || otherUser);
    document.getElementById('chatRoomAvatar').style.background = getAvatarColor(otherUser);
    
    document.getElementById('contentArea').style.display = 'none';
    document.getElementById('chatRoom').classList.add('active');
    document.querySelector('.bottom-nav').style.display = 'none';
    document.getElementById('chatMessages').innerHTML = '';
    
    if (messageListener) messageListener();
    messageListener = database.ref('messages/' + activeChatId).on('value', (snapshot) => renderMessages(snapshot.val()));
    
    setupTypingListener();
    await markMessagesAsRead();
    if (window.loadChats) loadChats();
    setTimeout(() => document.getElementById('messageInput')?.focus(), 300);
}

async function markMessagesAsRead() {
    const msgsRef = database.ref(`messages/${activeChatId}`);
    const snapshot = await msgsRef.once('value');
    const msgs = snapshot.val();
    if (msgs) {
        for (const [id, msg] of Object.entries(msgs)) {
            if (msg && msg.sender !== currentUser && !msg.read) {
                await msgsRef.child(id).update({ read: true });
            }
        }
    }
}

function renderMessages(messages) {
    const container = document.getElementById('chatMessages');
    if (!messages || Object.keys(messages).length === 0) {
        container.innerHTML = '<div class="empty-state">No messages yet. Start the conversation!</div>';
        return;
    }
    
    const messagesArray = Object.entries(messages).map(([id, msg]) => ({ id, ...msg }))
        .filter(msg => msg && msg.sender)
        .sort((a,b) => (a.timestamp||0) - (b.timestamp||0));
    
    container.innerHTML = messagesArray.map(msg => `
        <div class="message ${msg.sender === currentUser ? 'message-out' : 'message-in'}" onclick="showMessageActions('${msg.id}', '${escapeHtml(msg.text || '').replace(/'/g, "\\'")}', '${msg.sender}', '${msg.type}', '${msg.url || ''}')">
            ${msg.type === 'image' ? `<img src="${msg.url}" class="message-media" onclick="event.stopPropagation();viewMedia('${msg.url}','image')">` : ''}
            ${msg.type === 'video' ? `<video src="${msg.url}" class="message-media" controls onclick="event.stopPropagation()"></video>` : ''}
            ${msg.type === 'text' ? `<div class="message-text">${escapeHtml(msg.text)}${msg.edited ? ' <i class="fas fa-edit" style="font-size:0.7rem;"></i>' : ''}</div>` : ''}
            <div class="message-footer">
                <span class="message-time">${msg.time}</span>
                ${msg.sender === currentUser ? `<span class="read-status">${msg.read ? '✓✓' : '✓'}</span>` : ''}
            </div>
        </div>
    `).join('');
    
    container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !activeChatWith) return;
    if (typingTimeout) clearTimeout(typingTimeout);
    await database.ref(`typing/${activeChatId}`).remove();
    
    const newMessage = {
        sender: currentUser,
        type: 'text',
        text: text,
        time: formatTime(),
        timestamp: Date.now(),
        read: false
    };
    await database.ref('messages/' + activeChatId).push(newMessage);
    input.value = '';
    if (window.loadChats) loadChats();
}

function sendImage() {
    const input = document.getElementById('imageInput');
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file || !activeChatWith) return;
        showNotification('Uploading image...');
        const ref = storage.ref(`images/${activeChatId}/${Date.now()}_${file.name}`);
        await ref.put(file);
        const url = await ref.getDownloadURL();
        await database.ref('messages/' + activeChatId).push({
            sender: currentUser, type: 'image', url, time: formatTime(), timestamp: Date.now(), read: false
        });
        if (window.loadChats) loadChats();
        showNotification('Image sent!');
    };
    input.click();
}

function sendVideo() {
    const input = document.getElementById('videoInput');
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file || !activeChatWith) return;
        if (file.size > 10*1024*1024) { showNotification('Video too large (max 10MB)'); return; }
        showNotification('Uploading video...');
        const ref = storage.ref(`videos/${activeChatId}/${Date.now()}_${file.name}`);
        await ref.put(file);
        const url = await ref.getDownloadURL();
        await database.ref('messages/' + activeChatId).push({
            sender: currentUser, type: 'video', url, time: formatTime(), timestamp: Date.now(), read: false
        });
        if (window.loadChats) loadChats();
        showNotification('Video sent!');
    };
    input.click();
}

function closeChat() {
    if (messageListener) messageListener();
    if (typingListener) typingListener();
    messageListener = null; 
    typingListener = null;

    if (typingTimeout) clearTimeout(typingTimeout);

    activeChatWith = null; 
    activeChatId = null;

    document.getElementById('contentArea').style.display = 'block';
    document.getElementById('chatRoom').classList.remove('active');
    document.querySelector('.bottom-nav').style.display = 'flex';

    // refresh chat list
    if (window.loadChats) loadChats();
}
function handleKeyPress(event) { 
    if (event.key === 'Enter') sendMessage(); 
}

function onTyping() {
    if (!activeChatWith || !activeChatId) return;
    database.ref(`typing/${activeChatId}`).set({ user: currentUser, timestamp: Date.now() });
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => database.ref(`typing/${activeChatId}`).remove(), 2000);
}

function setupTypingListener() {
    if (!activeChatId) return;
    if (typingListener) typingListener();
    typingListener = database.ref(`typing/${activeChatId}`).on('value', (snapshot) => {
        const data = snapshot.val();
        const existing = document.getElementById('typingIndicator');
        if (data && data.user !== currentUser && (Date.now() - data.timestamp) < 3000) {
            if (!existing) {
                const div = document.createElement('div');
                div.id = 'typingIndicator';
                div.className = 'typing-bubble';
                div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
                document.getElementById('chatMessages').appendChild(div);
                document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
            }
        } else if (existing) existing.remove();
    });
}

function setupUnreadListener() {
    database.ref('messages').on('value', (snapshot) => {
        const allMessages = snapshot.val() || {};
        unreadCounts = {};
        for (const [chatId, messages] of Object.entries(allMessages)) {
            if (chatId && chatId.includes('_')) {
                const parts = chatId.split('_');
                if (parts.length === 2) {
                    const other = parts[0] === currentUser ? parts[1] : parts[0];
                    let unread = 0;
                    if (messages) {
                        for (const msg of Object.values(messages)) {
                            if (msg && msg.sender !== currentUser && !msg.read) unread++;
                        }
                    }
                    if (unread > 0) unreadCounts[other] = unread;
                }
            }
        }
        if (document.getElementById('chatsPage').classList.contains('active')) loadChats();
    });
}

function setupMessageListener() {
    database.ref('messages').on('child_added', async (snapshot) => {
        const chatId = snapshot.key;
        if (chatId && chatId.includes('_')) {
            const parts = chatId.split('_');
            const other = parts[0] === currentUser ? parts[1] : parts[0];
            if (other && other !== currentUser && activeChatWith !== other) {
                const messages = snapshot.val();
                if (messages) {
                    const lastMsg = Object.values(messages)[Object.values(messages).length - 1];
                    if (lastMsg && lastMsg.sender !== currentUser) {
                        if (soundEnabled) playSound.play();
                        const userSnap = await database.ref('users/' + lastMsg.sender).once('value');
                        const sender = userSnap.val();
                        sendDesktopNotification(`New message from ${sender?.displayName || lastMsg.sender}`, 
                            lastMsg.type === 'text' ? lastMsg.text : (lastMsg.type === 'image' ? '📷 Image' : '🎥 Video'));
                    }
                }
            }
        }
        if (activeChatId === snapshot.key && messageListener) {
            const msgs = await database.ref(`messages/${activeChatId}`).once('value');
            renderMessages(msgs.val());
        }
        if (window.loadChats) loadChats();
    });
    
    database.ref('messages').on('child_changed', async (snapshot) => {
        if (snapshot.key === activeChatId) {
            const msgs = await database.ref(`messages/${activeChatId}`).once('value');
            renderMessages(msgs.val());
        }
        if (window.loadChats) loadChats();
    });
    
    database.ref('messages').on('child_removed', async (snapshot) => {
        if (snapshot.key === activeChatId) {
            const msgs = await database.ref(`messages/${activeChatId}`).once('value');
            renderMessages(msgs.val());
        }
        if (window.loadChats) loadChats();
    });
}

function showMessageActions(msgId, msgText, msgSender, msgType, msgUrl) {
    currentMessageId = msgId;
    const modal = document.getElementById('actionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalButtons = document.getElementById('modalButtons');
    
    modalTitle.textContent = 'Message Options';
    let buttons = '';
    
    if (msgSender === currentUser && msgType === 'text') {
        buttons += `<button class="modal-edit" onclick="editMessage('${msgId}', '${escapeHtml(msgText).replace(/'/g, "\\'")}')"><i class="fas fa-edit"></i> Edit</button>`;
    }
    buttons += `<button class="modal-delete" onclick="deleteForEveryone('${msgId}')"><i class="fas fa-trash-alt"></i> Delete for Everyone</button>`;
    buttons += `<button class="modal-cancel" onclick="closeModal()"><i class="fas fa-times"></i> Cancel</button>`;
    
    modalButtons.innerHTML = buttons;
    modal.style.display = 'flex';
}

async function editMessage(msgId, oldText) {
    closeModal();
    const newText = prompt('Edit message:', oldText);
    if (newText && newText.trim()) {
        await database.ref(`messages/${activeChatId}/${msgId}`).update({
            text: newText.trim(),
            edited: true,
            editedAt: Date.now()
        });
        showNotification('Message edited!');
    }
}

async function deleteForEveryone(msgId) {
    closeModal();
    if (confirm('Delete this message for everyone?')) {
        await database.ref(`messages/${activeChatId}/${msgId}`).remove();
        showNotification('Message deleted for everyone!');
    }
}

function viewMedia(url, type) {
    // Open media in new tab
    window.open(url, '_blank');
}
