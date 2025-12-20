(function () {
    let adminToken = localStorage.getItem('fekoyaha_admin_token') || '';
    let currentRoom = null;

    // DOM Elements
    const loginOverlay = document.getElementById('loginOverlay');
    const loginForm = document.getElementById('loginForm');
    const adminPassword = document.getElementById('adminPassword');
    const loginError = document.getElementById('loginError');
    const roomsList = document.getElementById('roomsList');
    const roomDetailModal = document.getElementById('roomDetailModal');

    // Initialize
    if (adminToken) {
        checkAuth();
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        adminToken = adminPassword.value;
        await checkAuth();
    });

    async function checkAuth() {
        try {
            const resp = await fetch(window.FEKO_CONFIG.getApiUrl('/api/admin/rooms'), {
                headers: { 'Authorization': adminToken }
            });

            if (resp.ok) {
                localStorage.setItem('fekoyaha_admin_token', adminToken);
                loginOverlay.style.display = 'none';
                renderRooms(await resp.json());
            } else {
                throw new Error('Auth failed');
            }
        } catch (err) {
            loginError.style.display = 'block';
            localStorage.removeItem('fekoyaha_admin_token');
        }
    }

    window.refreshRooms = checkAuth;

    window.logout = () => {
        localStorage.removeItem('fekoyaha_admin_token');
        window.location.reload();
    };

    function formatTimeIST(timestamp) {
        return new Date(timestamp).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    function parseUA(ua) {
        if (!ua || ua === 'unknown') return { browser: 'Unknown', device: 'Unknown' };

        let browser = 'Other';
        let device = 'PC/Laptop';

        if (ua.includes('Mobi')) device = 'Mobile';
        if (ua.includes('Tablet')) device = 'Tablet';

        if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
        else if (ua.includes('Edge')) browser = 'Edge';

        return { browser, device };
    }

    function renderRooms(data) {
        roomsList.innerHTML = '';
        const rooms = data.rooms.sort((a, b) => b.lastActiveAt - a.lastActiveAt);

        rooms.forEach(room => {
            const tr = document.createElement('tr');
            const isActive = Date.now() - room.lastActiveAt < 5 * 60 * 1000;

            tr.innerHTML = `
                <td><strong>${room.keyword}</strong></td>
                <td>${formatTimeIST(room.createdAt)}</td>
                <td>${formatTimeIST(room.lastActiveAt)}</td>
                <td>
                    <span class="status-dot ${isActive ? 'status-online' : 'status-idle'}"></span>
                    ${isActive ? 'Active' : 'Idle'}
                </td>
                <td>
                    <button class="btn-admin" onclick="viewRoom('${room.keyword}')">Inspect</button>
                </td>
            `;
            roomsList.appendChild(tr);
        });
    }

    window.viewRoom = async (keyword) => {
        currentRoom = keyword;
        document.getElementById('modalRoomTitle').textContent = `Inspecting: ${keyword}`;
        roomDetailModal.style.display = 'flex';
        await refreshRoomDetails();
    };

    async function refreshRoomDetails() {
        if (!currentRoom) return;

        try {
            const resp = await fetch(window.FEKO_CONFIG.getApiUrl(`/api/admin/room/${currentRoom}/info`), {
                headers: { 'Authorization': adminToken }
            });
            const data = await resp.json();

            // Render Messages
            const msgArea = document.getElementById('adminMessages');
            msgArea.innerHTML = data.messages.map(m => `
                <div style="margin-bottom: 0.5rem; font-size: 0.85rem;">
                    <span style="color: ${m.sender.color}; font-weight: 600;">${m.sender.nickname}:</span>
                    <span style="color: var(--text-secondary);">${m.content}</span>
                    <small style="color: var(--text-muted); float: right;">${new Date(m.timestamp).toLocaleTimeString()}</small>
                </div>
            `).join('') || '<p style="color: var(--text-muted); text-align: center;">No messages</p>';
            msgArea.scrollTop = msgArea.scrollHeight;

            // Render Participants
            const pList = document.getElementById('participantsList');
            pList.innerHTML = data.participants.map(p => {
                const uaInfo = parseUA(p.ua);
                const city = p.cf?.city || 'Unknown';
                const country = p.cf?.country || '';
                const location = city !== 'Unknown' ? `${city}, ${country}` : 'Unknown';

                return `
                    <div class="participant-card">
                        <strong>${p.nickname}</strong>
                        <span>IP: ${p.ip === 'unknown' ? 'Detected' : p.ip}</span>
                        <span>Loc: ${location}</span>
                        <span>Joined: ${formatTimeIST(p.joinedAt)}</span>
                        <span>Device: ${uaInfo.device} (${uaInfo.browser})</span>
                    </div>
                `;
            }).join('') || '<p style="color: var(--text-muted);">No active users</p>';

            // Stats
            document.getElementById('roomStats').innerHTML = `
                <p>Messages: ${data.messages.length}</p>
                <p>Locked: ${data.isLocked ? 'Yes' : 'No'}</p>
            `;

            document.getElementById('lockBtn').textContent = data.isLocked ? 'Unlock Room' : 'Lock Room';

        } catch (err) {
            console.error('Failed to fetch room details', err);
        }
    }

    window.closeRoomDetails = () => {
        roomDetailModal.style.display = 'none';
        currentRoom = null;
    };

    window.toggleLock = async () => {
        const resp = await fetch(window.FEKO_CONFIG.getApiUrl(`/api/admin/room/${currentRoom}/lock`), {
            method: 'POST',
            headers: { 'Authorization': adminToken }
        });
        if (resp.ok) await refreshRoomDetails();
    };

    window.clearHistory = async () => {
        if (!confirm('Clear all messages in this room?')) return;
        const resp = await fetch(window.FEKO_CONFIG.getApiUrl(`/api/admin/room/${currentRoom}/clear`), {
            method: 'POST', // Actually we used proxy which might need to handle method
            headers: { 'Authorization': adminToken }
        });
        if (resp.ok) await refreshRoomDetails();
    };

    window.deleteRoom = async () => {
        if (!confirm('PERMANENTLY DELETE this room and all data?')) return;
        const resp = await fetch(window.FEKO_CONFIG.getApiUrl(`/api/admin/room/${currentRoom}/delete`), {
            method: 'POST',
            headers: { 'Authorization': adminToken }
        });
        if (resp.ok) {
            closeRoomDetails();
            refreshRooms();
        }
    };

})();
