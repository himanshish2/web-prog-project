/**
 * CampusCarry — Shared App Logic (app.js)
 * Handles all localStorage data operations across pages.
 */

const CC = {
    // ── User ──────────────────────────────────────────
    getUser() {
        return JSON.parse(localStorage.getItem('cc_user') || 'null');
    },
    setUser(user) {
        localStorage.setItem('cc_user', JSON.stringify(user));
    },
    requireLogin() {
        if (!this.getUser()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },
    logout() {
        localStorage.removeItem('cc_user');
        window.location.href = 'login.html';
    },

    // ── Requests ──────────────────────────────────────
    getRequests() {
        return JSON.parse(localStorage.getItem('cc_requests') || '[]');
    },
    saveRequests(requests) {
        localStorage.setItem('cc_requests', JSON.stringify(requests));
    },
    addRequest(data) {
        const user = this.getUser();
        const requests = this.getRequests();
        const req = {
            id: Date.now(),
            requester: user.name,
            ...data,
            status: 'open',   // open | accepted | in-transit | completed
            runner: null,
            runnerContact: null,
            createdAt: new Date().toISOString()
        };
        requests.unshift(req);
        this.saveRequests(requests);
        return req;
    },
    getRequestById(id) {
        return this.getRequests().find(r => r.id === Number(id));
    },
    acceptRequest(id) {
        const user = this.getUser();
        const requests = this.getRequests();
        const req = requests.find(r => r.id === Number(id));
        if (!req || req.status !== 'open') return false;
        req.status = 'accepted';
        req.runner = user.name;
        req.runnerContact = user.contact || '';
        this.saveRequests(requests);
        return true;
    },
    updateStatus(id, newStatus) {
        const requests = this.getRequests();
        const req = requests.find(r => r.id === Number(id));
        if (!req) return false;
        req.status = newStatus;
        this.saveRequests(requests);
        return true;
    },

    // ── Helpers ───────────────────────────────────────
    timeAgo(iso) {
        const diff = Date.now() - new Date(iso).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'just now';
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
    },
    statusLabel(s) {
        return { open:'Open', accepted:'Accepted', 'in-transit':'In Transit', completed:'Completed' }[s] || s;
    },
    statusColor(s) {
        return { open:'#c19c00', accepted:'#2563eb', 'in-transit':'#7c3aed', completed:'#16a34a' }[s] || '#888';
    },

    // ── Topbar renderer (shared across pages) ─────────
    renderTopbar(containerId, backHref, backLabel) {
        const user = this.getUser() || { name: 'Student' };
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = `
            <div class="tb-left">
                ${backHref ? `<a href="${backHref}" class="tb-back">${backLabel || '← Back'}</a>` : ''}
                <span class="tb-logo">Campus<span>Carry</span></span>
            </div>
            <div class="tb-right">
                <a href="my-requests.html" class="tb-link">My Activity</a>
                <div class="tb-avatar">${user.name.charAt(0).toUpperCase()}</div>
                <span class="tb-name">${user.name}</span>
                <button class="tb-logout" onclick="CC.logout()">Log out</button>
            </div>`;
    }
};
