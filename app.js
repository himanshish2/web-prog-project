/**
 * CampusCarry - Shared App Logic (app.js)
 * Handles all localStorage data operations for the signed-in pages.
 * The navbar and footer are NOT built here: they come from layout.js.
 */

const CC = {
    // -- User ------------------------------------------------
    getUser() {
        try {
            return JSON.parse(localStorage.getItem('cc_user') || 'null');
        } catch (error) {
            return null;
        }
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

    // -- Requests --------------------------------------------
    getRequests() {
        try {
            return JSON.parse(localStorage.getItem('cc_requests') || '[]');
        } catch (error) {
            return [];
        }
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

    // -- Helpers ---------------------------------------------
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
        return { open: 'Open', accepted: 'Accepted', 'in-transit': 'In Transit', completed: 'Completed' }[s] || s;
    },
    // Same navy scale the tracking page uses, plus green for completed.
    statusColor(s) {
        return { open: '#53677A', accepted: '#363B8B', 'in-transit': '#0B0E52', completed: '#237A45' }[s] || '#53677A';
    }
};