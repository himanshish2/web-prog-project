// my-requests.js — My Activity

const myGrid = document.getElementById("myGrid");
const deliverGrid = document.getElementById("deliverGrid");

const tabs = {
    my: {
        button: document.getElementById("tabMy"),
        panel: document.getElementById("panelMy")
    },
    delivering: {
        button: document.getElementById("tabDelivering"),
        panel: document.getElementById("panelDelivering")
    }
};

const steps = [
    { status: "pending", label: "Posted", icon: "📋" },
    { status: "accepted", label: "Accepted", icon: "✅" },
    { status: "picked_up", label: "Picked Up", icon: "📦" },
    { status: "out_for_delivery", label: "Out for Delivery", icon: "🚀" },
    { status: "delivered", label: "Delivered", icon: "🎉" }
];

const statusLabels = {
    ...Object.fromEntries(steps.map(({ status, label }) => [status, label])),
    cancelled: "Cancelled",
    expired: "Expired"
};

const badgeClasses = {
    pending: "badgeOpen",
    accepted: "badgeAccepted",
    picked_up: "badgeInTransit",
    out_for_delivery: "badgeInTransit",
    delivered: "badgeCompleted"
};

const cardClasses = {
    picked_up: "isInTransit",
    out_for_delivery: "isInTransit",
    delivered: "isCompleted"
};

const nextSteps = {
    accepted: { status: "picked_up", label: "Mark as Picked Up" },
    picked_up: { status: "out_for_delivery", label: "Mark as Out for Delivery" },
    out_for_delivery: { status: "delivered", label: "Mark as Delivered" }
};

let isRefreshing = false;
let isUpdating = false;

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatTime(iso) {
    if (!iso) return "recently";
    try {
        const diff = Date.now() - new Date(iso).getTime();
        if (Number.isNaN(diff)) return "recently";
        const m = Math.floor(diff / 60000);
        if (m < 1) return "just now";
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
    } catch (e) {
        return "recently";
    }
}

function switchTab(activeTab) {
    for (const [name, tab] of Object.entries(tabs)) {
        const isActive = name === activeTab;
        tab.button.classList.toggle("active", isActive);
        tab.button.setAttribute("aria-selected", String(isActive));
        tab.panel.classList.toggle("active", isActive);
    }
}

function renderStepper(status) {
    const current = steps.findIndex((step) => step.status === status);
    if (current === -1) return "";

    const items = steps.map((step, index) => {
        let state = "";
        if (index < current) state = "done";
        if (index === current) state = "active";

        return `
            <div class="stepItem ${state}">
                <div class="stepDot" aria-hidden="true">${step.icon}</div>
                <div class="stepLabel">${step.label}</div>
            </div>`;
    }).join("");

    return `<div class="stepper">${items}</div>`;
}

function renderRequesterDetails(request) {
    const trackingUrl = `tracking.html?id=${encodeURIComponent(request.id)}`;

    if (request.deliveryPartnerId) {
        const acceptedUrl = `accepted.html?id=${encodeURIComponent(request.id)}`;
        return `
            <div class="infoBox">
                <strong>Your Runner</strong>
                ${escapeHtml(request.deliveryPartner?.name || "Assigned")}
            </div>
            <div class="updateBtnRow">
                <a class="btnSecondary" href="${escapeHtml(trackingUrl)}">Track Parcel</a>
                <a class="btnSecondary" href="${escapeHtml(acceptedUrl)}">View Details &amp; Chat</a>
            </div>`;
    }

    if (request.status === "pending") {
        return `
            <p class="waitingNote">Waiting for a runner to accept your request…</p>
            <div class="updateBtnRow">
                <a class="btnSecondary" href="${escapeHtml(trackingUrl)}">Track / Manage</a>
            </div>`;
    }

    return `
        <div class="updateBtnRow">
            <a class="btnSecondary" href="${escapeHtml(trackingUrl)}">View Summary</a>
        </div>`;
}

function renderDeliveryDetails(request) {
    const next = nextSteps[request.status];
    const trackingUrl = `tracking.html?id=${encodeURIComponent(request.id)}`;

    const pickupDetails = request.pickupOtp ? `
        <div class="infoBox">
            <strong>Pickup details</strong>
            ${escapeHtml(request.companyName || "Courier")} ·
            Agent: ${escapeHtml(request.agentName || "N/A")}
            ${request.agentMobile ? ` · ${escapeHtml(request.agentMobile)}` : ""}
            · Code: ${escapeHtml(request.pickupOtp)}
        </div>` : "";

    const nextButton = next ? `
        <button type="button" class="btnPrimary"
                data-advance-id="${escapeHtml(request.id)}"
                data-next="${next.status}">
            ${next.label}
        </button>` : "";

    return `
        ${pickupDetails}
        ${request.status === "delivered"
            ? `<p class="doneNote">Delivery complete! You earned ₹${escapeHtml(request.reward)}.</p>`
            : ""}
        <div class="updateBtnRow">
            <a class="btnSecondary" href="${escapeHtml(trackingUrl)}">Track Parcel</a>
            ${nextButton}
        </div>`;
}

function renderCard(request, isDelivering) {
    return `
        <div class="reqCard ${cardClasses[request.status] || ""}">
            <div class="accentBar"></div>
            <div class="reqHeader">
                <div>
                    <div class="reqTitle">${escapeHtml(request.companyName)} parcel</div>
                    <div class="reqMeta">
                        ${isDelivering
                            ? `<span>Requested by ${escapeHtml(request.requester?.name || "Student")}</span>`
                            : ""}
                        <span>${escapeHtml(formatTime(request.createdAt))}</span>
                        <span class="badge ${badgeClasses[request.status] || "badgeOpen"}">
                            ${escapeHtml(statusLabels[request.status] || request.status)}
                        </span>
                        ${request.isUrgent ? '<span class="badge badgeUrgent">Urgent</span>' : ""}
                    </div>
                </div>
                <div class="reqReward">₹${escapeHtml(request.reward)}</div>
            </div>

            <div class="reqRoute">
                <span class="loc">📍 ${escapeHtml(request.pickupLocation)}</span>
                <span class="routeArrow" aria-hidden="true">&rarr;</span>
                <span class="loc">🏁 ${escapeHtml(request.dropLocation)}</span>
            </div>

            ${request.itemDescription
                ? `<p class="reqNotes">${escapeHtml(request.itemDescription)}</p>`
                : ""}
            ${renderStepper(request.status)}
            ${isDelivering ? renderDeliveryDetails(request) : renderRequesterDetails(request)}
        </div>`;
}

async function loadList(grid, endpoint, isDelivering) {
    try {
        const requests = await api.get(endpoint);

        if (requests.length > 0) {
            grid.innerHTML = requests.map((request) => renderCard(request, isDelivering)).join("");
            return;
        }

        grid.innerHTML = isDelivering
            ? `<div class="gridEmpty">
                   <h3>Not delivering anything yet</h3>
                   <p>Accept a parcel from Available Requests to see it here.</p>
                   <a href="available-requests.html" class="btnPrimary">Browse Requests</a>
               </div>`
            : `<div class="gridEmpty">
                   <h3>No requests yet</h3>
                   <p>You haven't posted any delivery requests.</p>
                   <a href="create-request.html" class="btnPrimary">Create a Request</a>
               </div>`;
    } catch (error) {
        grid.textContent = api.describeError(error);
    }
}

async function refreshActivity() {
    if (isRefreshing || isUpdating) return;

    isRefreshing = true;
    try {
        await Promise.all([
            loadList(myGrid, "/api/requests/mine", false),
            loadList(deliverGrid, "/api/requests/delivering", true)
        ]);
    } finally {
        isRefreshing = false;
    }
}

// Keep the existing Profile page's local earnings display working.
function recordCompletedDelivery(request) {
    try {
        const saved = JSON.parse(localStorage.getItem("completedDeliveries"));
        const history = Array.isArray(saved) ? saved : [];

        if (history.some((delivery) => delivery.requestId === request.id)) return;

        history.push({
            requestId: request.id,
            fromLocation: request.pickupLocation,
            toLocation: request.dropLocation,
            reward: request.reward,
            status: "successful",
            date: new Date(request.deliveredAt || Date.now()).toLocaleDateString("en-IN")
        });

        localStorage.setItem("completedDeliveries", JSON.stringify(history));
    } catch (error) {
        console.warn("Could not update the local profile history.", error);
    }
}

async function advanceStatus(button) {
    if (isUpdating || isRefreshing) return;

    isUpdating = true;
    button.disabled = true;

    try {
        const id = encodeURIComponent(button.dataset.advanceId);
        const request = await api.request("PATCH", `/api/requests/${id}/status`, {
            status: button.dataset.next
        });

        if (request.status === "delivered") {
            recordCompletedDelivery(request);
        }
    } catch (error) {
        alert(api.describeError(error));
    } finally {
        isUpdating = false;
        button.disabled = false;
    }

    await refreshActivity();
}

async function startActivity() {
    try {
        const user = await api.me();
        if (!user) {
            window.location.href = "login.html";
            return;
        }
    } catch (error) {
        myGrid.textContent = api.describeError(error);
        return;
    }

    tabs.my.button.addEventListener("click", () => switchTab("my"));
    tabs.delivering.button.addEventListener("click", () => switchTab("delivering"));

    deliverGrid.addEventListener("click", (event) => {
        const button = event.target.closest("[data-advance-id]");
        if (button) advanceStatus(button);
    });

    switchTab(window.location.hash === "#delivering" ? "delivering" : "my");
    await refreshActivity();
    setInterval(refreshActivity, 8000);
}

startActivity();