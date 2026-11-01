// available-requests.js - browse and accept open requests (uses the CC data layer from app.js)

// Not logged in: requireLogin() sends the visitor to login.html and we stop here.
const user = CC.requireLogin() ? CC.getUser() : null;

const grid = document.getElementById("cardsGrid");
const searchInput = document.getElementById("searchInput");
const countLabel = document.getElementById("reqCount");
const modal = document.getElementById("modal");
const filterButtons = document.querySelectorAll(".filterBtn");

let currentFilter = "all";      // which urgency filter is active
let pendingAcceptId = null;     // id of the request the user clicked "Accept" on
let firstRender = true;         // only the first draw plays the entrance animation

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
    const search = searchInput.value.toLowerCase();

    // Keep a request only if it is open, not the user's own, and matches filter + search.
    const list = CC.getRequests().filter(function (r) {
        if (r.status !== "open") return false;
        if (r.requester === user.name) return false;
        if (currentFilter === "urgent" && r.urgency !== "urgent") return false;
        if (search && !contains(r.itemName, search) && !contains(r.pickup, search) && !contains(r.dropoff, search)) {
            return false;
        }
        return true;
    });

    countLabel.textContent = list.length === 0
        ? "No requests match your search"
        : list.length + " request" + (list.length !== 1 ? "s" : "") + " available";

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
                            '<span>🕐 ' + esc(CC.timeAgo(r.createdAt)) + '</span>' +
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
                    '<span class="reqContact">Contact: ' + esc(r.contact) + '</span>' +
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
    modal.classList.add("open");
}

function closeModal() {
    modal.classList.remove("open");
    pendingAcceptId = null;
}

function confirmAccept() {
    if (!pendingAcceptId) return;

    const ok = CC.acceptRequest(pendingAcceptId);   // saves to localStorage
    closeModal();

    if (ok) {
        // my-requests.html shows the runner the delivery details
        window.location.href = "my-requests.html";
    } else {
        alert("This request was just accepted by someone else. Please pick another.");
        renderCards();
    }
}

// ---------- Events (only when logged in) ----------
if (user) {
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

    searchInput.addEventListener("input", renderCards);

    // One listener for every Accept button (the cards are redrawn often).
    grid.addEventListener("click", function (event) {
        const button = event.target.closest("[data-accept-id]");
        if (button) openModal(button.dataset.acceptId);
    });

    document.getElementById("cancelAccept").addEventListener("click", closeModal);
    document.getElementById("confirmAccept").addEventListener("click", confirmAccept);

    // Click the dark background or press Escape to close.
    modal.addEventListener("click", function (event) {
        if (event.target === modal) closeModal();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && modal.classList.contains("open")) closeModal();
    });

    renderCards();
    setInterval(renderCards, 10000);    // simulates real-time updates
}
