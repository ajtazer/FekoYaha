// Room JavaScript for FekoYaha
(function () {
    const COLORS = [
        '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
        '#2196F3', '#00BCD4', '#009688', '#4CAF50',
        '#FF9800', '#FF5722', '#795548', '#607D8B',
    ];

    // State
    let ws = null;
    let reconnectAttempts = 0;
    let pendingImage = null;
    let isScrolledUp = false;
    let nickname = localStorage.getItem('fekoyaha_nickname') || '';
    let color = localStorage.getItem('fekoyaha_color') || '';

    // DOM Elements
    const roomStatusModal = document.getElementById('roomStatusModal');
    const modalIcon = document.getElementById('modalIcon');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalActions = document.getElementById('modalActions');
    const modalPrimaryBtn = document.getElementById('modalPrimaryBtn');
    const nicknameModal = document.getElementById('nicknameModal');
    const nicknameForm = document.getElementById('nicknameForm');
    const nicknameInput = document.getElementById('nicknameInput');
    const messagesArea = document.getElementById('messagesArea');
    const messagesList = document.getElementById('messagesList');
    const newMessagesBtn = document.getElementById('newMessagesBtn');
    const composer = document.getElementById('composer');
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const uploadPreview = document.getElementById('uploadPreview');
    const previewImage = document.getElementById('previewImage');
    const removePreview = document.getElementById('removePreview');
    const userBadge = document.getElementById('userBadge');
    const userColor = document.getElementById('userColor');
    const userNickname = document.getElementById('userNickname');
    const userCountNum = document.getElementById('userCountNum');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxClose = document.getElementById('lightboxClose');

    function getRandomColor() {
        return COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    window.initRoom = async function () {
        const keyword = window.ROOM_KEYWORD;
        if (!keyword) return;

        console.log('[Room] Initializing keyword:', keyword);

        // Reset state
        if (ws) {
            ws.close();
            ws = null;
        }
        messagesList.innerHTML = '';
        roomStatusModal.style.display = 'flex';
        modalActions.style.display = 'none';
        modalIcon.textContent = '🔍';
        modalTitle.textContent = 'Checking room...';
        modalMessage.textContent = 'Please wait while we check if this room exists.';

        try {
            if (!window.FEKO_CONFIG) {
                throw new Error('FEKO_CONFIG not ready');
            }
            const infoUrl = window.FEKO_CONFIG.getApiUrl('/api/room/' + keyword + '/info');
            console.log('[Room] Fetching info from:', infoUrl);

            const response = await fetch(infoUrl);
            if (!response.ok) throw new Error('API responded with ' + response.status);

            const data = await response.json();
            console.log('[Room] Info received:', data);

            if (data.exists) {
                showJoinPrompt();
            } else {
                showCreatePrompt();
            }
        } catch (error) {
            console.error('[Room] Init error:', error);
            showError('Failed to connect to backend: ' + error.message);
        }
    };

    function showCreatePrompt() {
        modalIcon.textContent = '✨';
        modalTitle.textContent = 'Create Room';
        modalMessage.textContent = 'This room does not exist yet. Would you like to create it?';
        modalActions.style.display = 'flex';
        modalPrimaryBtn.textContent = 'Create Room';
        modalPrimaryBtn.onclick = createRoom;
    }

    function showJoinPrompt() {
        modalIcon.textContent = '👋';
        modalTitle.textContent = 'Join Room';
        modalMessage.textContent = 'This room exists. Click below to join.';
        modalActions.style.display = 'flex';
        modalPrimaryBtn.textContent = 'Join Room';
        modalPrimaryBtn.onclick = promptNickname;
    }

    function showError(message) {
        modalIcon.textContent = '❌';
        modalTitle.textContent = 'Error';
        modalMessage.textContent = message;
        modalActions.style.display = 'flex';
        modalPrimaryBtn.textContent = 'Refresh';
        modalPrimaryBtn.onclick = () => window.location.reload();
    }

    async function createRoom() {
        const keyword = window.ROOM_KEYWORD;
        modalIcon.textContent = '⏳';
        modalTitle.textContent = 'Creating...';
        modalMessage.textContent = 'Setting up your room...';
        modalActions.style.display = 'none';

        try {
            const response = await fetch(window.FEKO_CONFIG.getApiUrl('/api/room/' + keyword + '/create'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                promptNickname();
            } else {
                const data = await response.json();
                showError(data.error || 'Failed to create room');
            }
        } catch (error) {
            showError('Failed to create room');
        }
    }

    function promptNickname() {
        roomStatusModal.style.display = 'none';
        if (nickname) {
            if (!color) {
                color = getRandomColor();
                localStorage.setItem('fekoyaha_color', color);
            }
            connectWebSocket();
            return;
        }
        nicknameModal.style.display = 'flex';
        nicknameInput.focus();
    }

    nicknameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const value = nicknameInput.value.trim();
        if (!value) return;
        nickname = value.slice(0, 20);
        color = getRandomColor();
        localStorage.setItem('fekoyaha_nickname', nickname);
        localStorage.setItem('fekoyaha_color', color);
        nicknameModal.style.display = 'none';
        connectWebSocket();
    });

    function connectWebSocket() {
        const keyword = window.ROOM_KEYWORD;
        const wsUrl = window.FEKO_CONFIG.getWsUrl('/api/room/' + keyword + '/ws?nickname=' + encodeURIComponent(nickname) + '&color=' + encodeURIComponent(color));

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            reconnectAttempts = 0;
            showComposer();
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleMessage(data);
        };

        ws.onclose = () => {
            if (reconnectAttempts < 5) {
                reconnectAttempts++;
                setTimeout(connectWebSocket, 1000 * reconnectAttempts);
            }
        };
    }

    function showComposer() {
        composer.style.display = 'block';
        userNickname.textContent = nickname;
        userColor.style.background = color;
        messageInput.focus();
    }

    function handleMessage(data) {
        switch (data.type) {
            case 'history': renderHistory(data.payload.messages); break;
            case 'message': appendMessage(data.payload); break;
            case 'users': userCountNum.textContent = data.payload.count; break;
        }
    }

    function renderHistory(messages) {
        messagesList.innerHTML = '';
        messages.forEach(msg => appendMessage(msg, false));
        scrollToBottom();
    }

    function appendMessage(msg, animate = true) {
        const div = document.createElement('div');
        div.className = 'message' + (msg.type === 'system' ? ' system' : '');
        if (!animate) div.style.animation = 'none';

        if (msg.type === 'system') {
            div.innerHTML = '<span class="message-text">' + escapeHtml(msg.content) + '</span>';
        } else {
            const initial = msg.sender.nickname.charAt(0).toUpperCase();
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            let contentHtml = '<p class="message-text">' + escapeHtml(msg.content) + '</p>';
            if (msg.type === 'image' && msg.content.startsWith('/files/')) {
                const fullUrl = window.FEKO_CONFIG.getApiUrl(msg.content);
                contentHtml = '<img class="message-image" src="' + fullUrl + '" alt="Shared image" onclick="window.openLightbox(this.src)">';
            }

            div.innerHTML = `
        <div class="message-avatar" style="background: ${msg.sender.color}">${initial}</div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-sender" style="color: ${msg.sender.color}">${escapeHtml(msg.sender.nickname)}</span>
            <span class="message-time">${time}</span>
          </div>
          ${contentHtml}
        </div>`;
        }

        messagesList.appendChild(div);
        if (!isScrolledUp) scrollToBottom(); else if (animate) newMessagesBtn.style.display = 'block';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function scrollToBottom() {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    messagesArea.addEventListener('scroll', () => {
        isScrolledUp = messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight > 100;
        if (!isScrolledUp) newMessagesBtn.style.display = 'none';
    });

    newMessagesBtn.addEventListener('click', () => {
        scrollToBottom();
        newMessagesBtn.style.display = 'none';
    });

    messageInput.addEventListener('input', () => {
        sendBtn.disabled = !messageInput.value.trim() && !pendingImage;
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
    });

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (messageInput.value.trim() || pendingImage) messageForm.dispatchEvent(new Event('submit'));
        }
    });

    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (pendingImage) { await sendImage(); return; }
        const content = messageInput.value.trim();
        if (!content) return;
        sendMessage('text', content);
        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendBtn.disabled = true;
    });

    function sendMessage(type, content) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'message', payload: { type, content } }));
        }
    }

    messageInput.addEventListener('paste', (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) handleImageFile(file);
            }
        }
    });

    function handleImageFile(file) {
        if (file.size > 20 * 1024 * 1024) { alert('Image too large (max 20MB)'); return; }
        pendingImage = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            uploadPreview.style.display = 'block';
            sendBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    removePreview.addEventListener('click', () => {
        pendingImage = null;
        uploadPreview.style.display = 'none';
        sendBtn.disabled = !messageInput.value.trim();
    });

    async function sendImage() {
        if (!pendingImage) return;
        const keyword = window.ROOM_KEYWORD;
        try {
            const response = await fetch(window.FEKO_CONFIG.getApiUrl('/api/room/' + keyword + '/upload'), {
                method: 'POST',
                body: JSON.stringify({ filename: pendingImage.name, contentType: pendingImage.type, size: pendingImage.size }),
            });
            const { key, fileUrl, uploadUrl } = await response.json();
            const formData = new FormData();
            formData.append('file', pendingImage);
            formData.append('key', key);
            const uploadResponse = await fetch(window.FEKO_CONFIG.getApiUrl(uploadUrl), { method: 'POST', body: formData });
            if (uploadResponse.ok) {
                sendMessage('image', fileUrl);
                removePreview.click();
            }
        } catch (e) { alert('Upload failed'); }
    }

    copyLinkBtn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(window.location.href);
        copyLinkBtn.querySelector('span').textContent = 'Copied!';
        setTimeout(() => copyLinkBtn.querySelector('span').textContent = 'Copy Link', 2000);
    });

    window.openLightbox = (src) => { lightboxImage.src = src; lightbox.style.display = 'flex'; };
    lightboxClose.addEventListener('click', () => lightbox.style.display = 'none');
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.style.display = 'none'; });
})();
