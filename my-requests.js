// my-requests.js - "My Activity": requests I posted + deliveries I accepted
// (uses the CC data layer from app.js)

// Not logged in: requireLogin() sends the visitor to login.html and we stop here.
const user = CC.requireLogin() ? CC.getUser() : null;

// The 4 stages a delivery goes through (looped over to build the stepper).
const STEPS = ["open", "accepted", "in-transit", "completed"];
const LABELS = ["Posted", "Accepted", "In Transit", "Delivered"];
const EMOJIS = ["📋", "✅", "🚀", "🎉"];

const myGrid = document.getElementById("myGrid");
const deliverGrid = document.getElementById("deliverGrid");

let firstRender = true;     // only the first draw plays the entrance animation

// Escape user-provided text before putting it in innerHTML.
function esc(text) {
    return String(text === undefined || text === null ? "" : text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Colour classes for each status (defined in dashboard.css).
function badgeClass(status) {
    return {
        "open": "badgeOpen",
        "accepted": "badgeAccepted",
        "in-transit": "badgeInTransit",
        "completed": "badgeCompleted"
    }[status] || "badgeOpen";
}

function cardClass(status) {
    return { "in-transit": "isInTransit", "completed": "isCompleted" }[status] || "";
}

// The 4-step progress tracker. Steps before the current one are "done",
// the current one is "active".
function buildStepper(status) {
    const current = STEPS.indexOf(status);
    let items = "";
    for (let i = 0; i < STEPS.length; i++) {
        let state = "";
        if (i < current) state = "done";
        else if (i === current) state = "active";
        items +=
            '<div class="stepItem ' + state + '">' +
                '<div class="stepDot">' + EMOJIS[i] + '</div>' +
                '<div class="stepLabel">' + LABELS[i] + '</div>' +
            '</div>';
    }
    return '<div class="stepper">' + items + '</div>';
}

function animationFor(index) {
    return firstRender
        ? { cls: " cardAnim", style: ' style="animation-delay:' + (index * 0.06) + 's"' }
        : { cls: "", style: "" };
}

// ---------- TAB 1: My Requests (requester view) ----------
function renderMyRequests() {
    const list = CC.getRequests().filter(function (r) {
        return r.requester === user.name;
    });

    if (list.length === 0) {
        myGrid.innerHTML =
            '<div class="gridEmpty">' +
            '<div class="emptyIcon" aria-hidden="true">📦</div>' +
            '<h3>No requests yet</h3>' +
            "<p>You haven't posted any delivery requests.</p>" +
            '<a href="create-request.html" class="btnPrimary">Create a Request</a>' +
            '</div>';
        return;
    }

    let html = "";
    for (let i = 0; i < list.length; i++) {
        const r = list[i];
        const anim = animationFor(i);

        const runnerHtml = r.runner
            ? '<div class="infoBox"><strong>Your Runner</strong>' + esc(r.runner) +
              (r.runnerContact ? " · 📞 " + esc(r.runnerContact) : "") + '</div>'
            : '<p class="waitingNote">⏳ Waiting for a runner to accept your request…</p>';

        html +=
            '<div class="reqCard' + anim.cls + " " + cardClass(r.status) + '"' + anim.style + '>' +
                '<div class="accentBar"></div>' +
                '<div class="reqHeader">' +
                    '<div>' +
                        '<div class="reqTitle">' + esc(r.itemName) + '</div>' +
                        '<div class="reqMeta">' +
                            '<span>🕐 ' + esc(CC.timeAgo(r.createdAt)) + '</span>' +
                            '<span class="badge ' + badgeClass(r.status) + '">' + esc(CC.statusLabel(r.status)) + '</span>' +
                            (r.urgency === "urgent" ? '<span class="badge badgeUrgent">Urgent</span>' : "") +
                        '</div>' +
                    '</div>' +
                    '<div class="reqReward">₹' + esc(r.reward) + '</div>' +
                '</div>' +
                '<div class="reqRoute">' +
                    '<span class="loc">📍 ' + esc(r.pickup) + '</span>' +
                    '<span class="routeArrow" aria-hidden="true">&rarr;</span>' +
                    '<span class="loc">🏁 ' + esc(r.dropoff) + '</span>' +
                '</div>' +
                buildStepper(r.status) +
                runnerHtml +
            '</div>';
    }
    myGrid.innerHTML = html;
}

// ---------- TAB 2: I'm Delivering (runner view) ----------
function renderDelivering() {
    const list = CC.getRequests().filter(function (r) {
        return r.runner === user.name;
    });

    if (list.length === 0) {
        deliverGrid.innerHTML =
            '<div class="gridEmpty">' +
            '<div class="emptyIcon" aria-hidden="true">🏃</div>' +
            '<h3>Not delivering anything yet</h3>' +
            '<p>Head to Available Requests and accept a delivery on your route.</p>' +
            '<a href="available-requests.html" class="btnPrimary">Browse Requests</a>' +
            '</div>';
        return;
    }

    let html = "";
    for (let i = 0; i < list.length; i++) {
        const r = list[i];
        const anim = animationFor(i);

        // What comes next, and what the button says.
        const canUpdate = (r.status === "accepted" || r.status === "in-transit");
        const nextStatus = (r.status === "accepted") ? "in-transit" : "completed";
        const nextLabel = (r.status === "accepted")
            ? "🚀 I've Picked It Up: Mark In Transit"
            : "✅ Delivered: Mark as Complete";

        let footer = "";
        if (canUpdate) {
            footer =
                '<div class="updateBtnRow">' +
                    '<button type="button" class="btnPrimary" data-advance-id="' + esc(r.id) +
                    '" data-next="' + nextStatus + '">' + nextLabel + '</button>' +
                '</div>';
        } else if (r.status === "completed") {
            footer = '<p class="doneNote">🎉 Delivery complete! You earned ₹' + esc(r.reward) + '.</p>';
        }

        // Pickup details the requester entered (only runners who accepted see this page).
        const pickupHtml = r.pickupOtp
            ? '<div class="infoBox"><strong>Pickup details</strong>' +
              esc(r.companyName || "Courier") + " · Agent: " + esc(r.agentName || "N/A") +
              (r.agentMobile ? " · 📞 " + esc(r.agentMobile) : "") +
              " · Code: " + esc(r.pickupOtp) + '</div>'
            : "";

        html +=
            '<div class="reqCard' + anim.cls + " " + cardClass(r.status) + '"' + anim.style + '>' +
                '<div class="accentBar"></div>' +
                '<div class="reqHeader">' +
                    '<div>' +
                        '<div class="reqTitle">' + esc(r.itemName) + '</div>' +
                        '<div class="reqMeta">' +
                            '<span>👤 Requested by ' + esc(r.requester) + '</span>' +
                            '<span>🕐 ' + esc(CC.timeAgo(r.createdAt)) + '</span>' +
                            '<span class="badge ' + badgeClass(r.status) + '">' + esc(CC.statusLabel(r.status)) + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="reqReward">₹' + esc(r.reward) + '</div>' +
                '</div>' +
                '<div class="reqRoute">' +
                    '<span class="loc">📍 <strong>Pickup:</strong> ' + esc(r.pickup) + '</span>' +
                    '<span class="routeArrow" aria-hidden="true">&rarr;</span>' +
                    '<span class="loc">🏁 <strong>Drop-off:</strong> ' + esc(r.dropoff) + '</span>' +
                '</div>' +
                buildStepper(r.status) +
                '<div class="infoBox"><strong>Requester Contact</strong>' +
                    esc(r.requester) + " · 📞 " + esc(r.contact || "N/A") + '</div>' +
                pickupHtml +
                (r.description ? '<p class="reqNotes"><strong>Notes:</strong> ' + esc(r.description) + '</p>' : "") +
                footer +
            '</div>';
    }
    deliverGrid.innerHTML = html;
}

// ---------- Earnings: a completed delivery is added to the profile's history ----------
function recordCompletedDelivery(request) {
    let list = [];
    try {
        list = JSON.parse(localStorage.getItem("completedDeliveries")) || [];
    } catch (error) {
        list = [];
    }
    if (list.some(function (d) { return d.requestId === request.id; })) return;

    list.push({
        requestId: request.id,
        fromLocation: request.pickup,
        toLocation: request.dropoff,
        reward: request.reward,
        status: "successful",
        date: new Date().toLocaleDateString("en-IN")
    });
    localStorage.setItem("completedDeliveries", JSON.stringify(list));
}

// ---------- Move a delivery to its next status ----------
function advanceStatus(id, newStatus) {
    CC.updateStatus(id, newStatus);
    if (newStatus === "completed") {
        const request = CC.getRequestById(id);
        if (request) recordCompletedDelivery(request);
    }
    renderDelivering();
    renderMyRequests();
}

// ---------- Tabs ----------
const tabButtons = { my: document.getElementById("tabMy"), delivering: document.getElementById("tabDelivering") };
const tabPanels = { my: document.getElementById("panelMy"), delivering: document.getElementById("panelDelivering") };

function switchTab(tab) {
    for (const name in tabButtons) {
        const isActive = (name === tab);
        tabButtons[name].classList.toggle("active", isActive);
        tabButtons[name].setAttribute("aria-selected", String(isActive));
        tabPanels[name].classList.toggle("active", isActive);
    }
}

// ---------- Start (only when logged in) ----------
if (user) {
    tabButtons.my.addEventListener("click", function () { switchTab("my"); });
    tabButtons.delivering.addEventListener("click", function () { switchTab("delivering"); });

    deliverGrid.addEventListener("click", function (event) {
        const button = event.target.closest("[data-advance-id]");
        if (button) advanceStatus(button.dataset.advanceId, button.dataset.next);
    });

    // Arriving right after accepting a delivery: open the "I'm Delivering" tab.
    if (window.location.hash === "#delivering") switchTab("delivering");

    renderMyRequests();
    renderDelivering();
    firstRender = false;

    // Auto-refresh every 8 seconds (simulates live tracking).
    setInterval(function () {
        renderMyRequests();
        renderDelivering();
    }, 8000);
}
