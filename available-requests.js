// available-requests.js - browse and accept open requests via live backend API

const grid = document.getElementById("cardsGrid");
const searchInput = document.getElementById("searchInput");
const countLabel = document.getElementById("reqCount");
const modal = document.getElementById("modal");
const filterButtons = document.querySelectorAll(".filterBtn");

let currentFilter = "all";      // which urgency filter is active
let pendingAcceptId = null;     // id of the request the user clicked "Accept" on
let firstRender = true;         // only the first draw plays the entrance animation
let availableRequests = [];

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

async function loadAvailableRequests() {
    try {
        const requests = await api.get("/api/requests");

        availableRequests = requests.map((request) => ({
            id: request.id,
            itemName: (request.companyName || "Courier") + " parcel",
            description: request.itemDescription,
            requester: request.requester?.name || "Student",
            pickup: request.pickupLocation,
            dropoff: request.dropLocation,
            reward: request.reward,
            urgency: request.isUrgent ? "urgent" : "normal",
            createdAt: request.createdAt
        }));

        renderCards();
    } catch (error) {
        countLabel.textContent = api.describeError(error);
    }
}

// Escape user-provided text before putting it in innerHTML.
function esc(text) {
    return String(text === undefined || text === null ? "" : text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// True when a (possibly missing) field contains the search text.
function contains(field, search) {
    return String(field || "").toLowerCase().includes(search);
}

function renderCards() {
    const search = searchInput ? searchInput.value.toLowerCase() : "";

    // Keep a request only if it matches filter + search.
    const list = availableRequests.filter(function (r) {
        if (currentFilter === "urgent" && r.urgency !== "urgent") return false;
        if (search && !contains(r.itemName, search) && !contains(r.pickup, search) && !contains(r.dropoff, search)) {
            return false;
        }
        return true;
    });

    if (countLabel) {
        countLabel.textContent = list.length === 0
            ? "No requests match your search"
            : list.length + " request" + (list.length !== 1 ? "s" : "") + " available";
    }

    if (list.length === 0) {
        grid.innerHTML =
            '<div class="gridEmpty">' +
            '<div class="emptyIcon" aria-hidden="true">📭</div>' +
            '<h3>Nothing here right now</h3>' +
            '<p>Check back soon. New requests appear here automatically.</p>' +
            '<a href="dashboard.html" class="btnSecondary">Back to Dashboard</a>' +
            '</div>';
        return;
    }

    let html = "";
    for (let i = 0; i < list.length; i++) {
        const r = list[i];
        const isUrgent = (r.urgency === "urgent");
        const animation = firstRender ? " cardAnim" : "";
        const delay = firstRender ? ' style="animation-delay:' + (i * 0.06) + 's"' : "";

        html +=
            '<div class="reqCard' + animation + (isUrgent ? " isUrgent" : "") + '"' + delay + '>' +
                '<div class="accentBar"></div>' +
                '<div class="reqHeader">' +
                    '<div>' +
                        '<div class="reqTitle">' + esc(r.itemName) + '</div>' +
                        '<div class="reqMeta">' +
                            '<span>👤 ' + esc(r.requester) + '</span>' +
                            '<span>🕐 ' + esc(formatTime(r.createdAt)) + '</span>' +
                            (isUrgent ? '<span class="badge badgeUrgent">Urgent</span>' : "") +
                        '</div>' +
                    '</div>' +
                    '<div class="reqReward">₹' + esc(r.reward) + '</div>' +
                '</div>' +
                (r.description ? '<p class="reqDescription">' + esc(r.description) + '</p>' : "") +
                '<div class="reqRoute">' +
                    '<span class="loc">📍 ' + esc(r.pickup) + '</span>' +
                    '<span class="routeArrow" aria-hidden="true">&rarr;</span>' +
                    '<span class="loc">🏁 ' + esc(r.dropoff) + '</span>' +
                '</div>' +
                '<div class="reqFooter">' +
                    '<button type="button" class="btnPrimary btnSmall" data-accept-id="' + esc(r.id) + '">Accept Request</button>' +
                '</div>' +
            '</div>';
    }
    grid.innerHTML = html;
    firstRender = false;
}

// ---------- Modal ----------
function openModal(id) {
    pendingAcceptId = id;
    if (modal) modal.classList.add("open");
}

function closeModal() {
    if (modal) modal.classList.remove("open");
    pendingAcceptId = null;
}

async function confirmAccept() {
    if (!pendingAcceptId) return;

    const button = document.getElementById("confirmAccept");
    const id = encodeURIComponent(pendingAcceptId);

    if (button) button.disabled = true;

    try {
        const parcel = await api.request(
            "PATCH",
            `/api/requests/${id}/accept`
        );

        closeModal();
        window.location.href =
            `tracking.html?id=${encodeURIComponent(parcel.id)}`;
    } catch (error) {
        closeModal();
        alert(api.describeError(error));
        await loadAvailableRequests();
    } finally {
        if (button) button.disabled = false;
    }
}

async function startAvailablePage() {
    try {
        const user = await api.me();
        if (!user) {
            window.location.replace("login.html");
            return;
        }
    } catch (e) {
        // layout.js handles unauthenticated redirects
    }

    for (let i = 0; i < filterButtons.length; i++) {
        filterButtons[i].addEventListener("click", function () {
            for (let j = 0; j < filterButtons.length; j++) {
                filterButtons[j].classList.remove("active");
            }
            filterButtons[i].classList.add("active");
            currentFilter = filterButtons[i].dataset.filter;
            renderCards();
        });
    }

    if (searchInput) searchInput.addEventListener("input", renderCards);

    if (grid) {
        grid.addEventListener("click", function (event) {
            const button = event.target.closest("[data-accept-id]");
            if (button) openModal(button.dataset.acceptId);
        });
    }

    const cancelBtn = document.getElementById("cancelAccept");
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    const confirmBtn = document.getElementById("confirmAccept");
    if (confirmBtn) confirmBtn.addEventListener("click", confirmAccept);

    if (modal) {
        modal.addEventListener("click", function (event) {
            if (event.target === modal) closeModal();
        });
    }
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && modal && modal.classList.contains("open")) closeModal();
    });

    await loadAvailableRequests();
    setInterval(loadAvailableRequests, 10000);
}

startAvailablePage();
