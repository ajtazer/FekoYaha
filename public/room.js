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
        if (!keyword || keyword === '__admin__') return;

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

            // Hide composer if room is locked
            if (data.isLocked) {
                composer.style.display = 'none';
            } else {
                composer.style.display = 'block';
            }

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

    let heartbeatInterval = null;

    function connectWebSocket() {
        const keyword = window.ROOM_KEYWORD;
        const wsUrl = window.FEKO_CONFIG.getWsUrl('/api/room/' + keyword + '/ws?nickname=' + encodeURIComponent(nickname) + '&color=' + encodeURIComponent(color));

        console.log('[Room] Connecting to WebSocket:', wsUrl);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('[Room] WebSocket connected');
            reconnectAttempts = 0;
            showComposer();
            startHeartbeat();
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'pong') return; // Silence heartbeats
                handleMessage(data);
            } catch (e) {
                console.error('[Room] Failed to parse message:', e, event.data);
            }
        };

        ws.onclose = (e) => {
            console.warn('[Room] WebSocket closed:', e.code, e.reason);
            stopHeartbeat();
            if (reconnectAttempts < 10) {
                reconnectAttempts++;
                console.log(`[Room] Reconnecting... (Attempt ${reconnectAttempts})`);
                setTimeout(connectWebSocket, Math.min(1000 * reconnectAttempts, 5000));
            } else {
                alert('Connection lost. Please refresh the page.');
            }
        };

        ws.onerror = (e) => {
            console.error('[Room] WebSocket Error:', e);
        };
    }

    function startHeartbeat() {
        stopHeartbeat();
        heartbeatInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 15000); // Send ping every 15s to keep DO alive
    }

    function stopHeartbeat() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
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
            case 'room-status':
                if (data.payload.isLocked) {
                    composer.style.display = 'none';
                } else {
                    composer.style.display = 'block';
                    messageInput.focus();
                }
                break;
            case 'error':
                alert(data.payload.message);
                break;
        }
    }

    let allMessages = [];
    let displayedCount = 0;
    const PAGE_SIZE = 25;

    function renderHistory(messages) {
        allMessages = messages;
        messagesList.innerHTML = '';
        displayedCount = 0;

        loadMoreMessages(true);
    }

    function loadMoreMessages(isInitial = false) {
        if (displayedCount >= allMessages.length) return;

        const nextCount = Math.min(displayedCount + PAGE_SIZE, allMessages.length);
        const toShow = allMessages.slice(allMessages.length - nextCount, allMessages.length - displayedCount);

        // Save scroll position for non-initial loads
        const oldScrollHeight = messagesArea.scrollHeight;
        const oldScrollTop = messagesArea.scrollTop;

        // Prepend messages (order: oldest to newest in the chunk)
        toShow.reverse().forEach(msg => {
            const div = createMessageElement(msg, false);
            messagesList.insertBefore(div, messagesList.firstChild);
        });

        displayedCount = nextCount;

        if (isInitial) {
            setTimeout(scrollToBottom, 50);
        } else {
            // Restore scroll position so it doesn't jump
            messagesArea.scrollTop = messagesArea.scrollHeight - oldScrollHeight + oldScrollTop;
        }
    }

    function createMessageElement(msg, animate = true) {
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
        return div;
    }

    function appendMessage(msg, animate = true) {
        const div = createMessageElement(msg, animate);
        messagesList.appendChild(div);

        // Update local buffer
        allMessages.push(msg);
        displayedCount++;

        if (!isScrolledUp) {
            scrollToBottom();
        } else if (animate) {
            newMessagesBtn.style.display = 'block';
        }
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
        const { scrollTop, scrollHeight, clientHeight } = messagesArea;
        isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;

        if (!isScrolledUp) {
            newMessagesBtn.style.display = 'none';
        }

        // Load more if at the top
        if (scrollTop === 0 && displayedCount < allMessages.length) {
            loadMoreMessages();
        }
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
            console.log('[Room] Sending message:', type);
            ws.send(JSON.stringify({ type: 'message', payload: { type, content } }));
        } else {
            console.warn('[Room] Cannot send message: WebSocket not open', { type, state: ws?.readyState });
            alert('Connection lost. Please wait a moment or refresh.');
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

        console.log('[Room] Starting sendImage process. Current WebSocket state:', ws?.readyState);

        // Show loader and disable inputs
        sendBtn.disabled = true;
        sendBtn.classList.add('loading');
        messageInput.disabled = true; // Prevent typing while uploading

        const loader = document.createElement('div');
        loader.className = 'upload-overlay';
        loader.innerHTML = '<div class="loader-dot"></div>';
        uploadPreview.appendChild(loader);

        try {
            console.log('[Room] Step 1: Requesting upload URL for:', pendingImage.name);
            const response = await fetch(window.FEKO_CONFIG.getApiUrl('/api/room/' + keyword + '/upload'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: pendingImage.name || 'image.png',
                    contentType: pendingImage.type || 'image/png',
                    size: pendingImage.size
                }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: 'Unknown server error' }));
                throw new Error(err.error || 'Failed to get upload URL');
            }

            const data = await response.json();
            const { key, fileUrl, uploadUrl } = data;

            console.log('[Room] Step 2: Uploading file to R2 via Worker:', uploadUrl);
            const formData = new FormData();
            formData.append('file', pendingImage);
            formData.append('key', key);

            const uploadResponse = await fetch(window.FEKO_CONFIG.getApiUrl(uploadUrl), {
                method: 'POST',
                body: formData
            });

            if (uploadResponse.ok) {
                console.log('[Room] Step 3: Upload successful! Parsing response...');
                // The worker returns JSON with { success: true, fileUrl: ... }
                const result = await uploadResponse.json().catch(() => ({}));
                const finalUrl = result.fileUrl || fileUrl;

                console.log('[Room] Step 4: Sending WebSocket message for image:', finalUrl);
                sendMessage('image', finalUrl);

                // Clear state
                removePreview.click();
            } else {
                const errBody = await uploadResponse.text();
                console.error('[Room] Upload failed on R2 stage:', errBody);
                throw new Error('R2 Upload failed: ' + (errBody || uploadResponse.statusText));
            }
        } catch (e) {
            console.error('[Room] CATASTROPHIC UPLOAD ERROR:', e);
            alert('Upload failed: ' + e.message);
        } finally {
            console.log('[Room] Resetting UI state after upload attempt');
            sendBtn.disabled = false;
            sendBtn.classList.remove('loading');
            messageInput.disabled = false;
            if (loader.parentNode) loader.parentNode.removeChild(loader);
            messageInput.focus();
        }
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
