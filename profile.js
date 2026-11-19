// profile.js - student profile page (details, live earnings & past deliveries from the backend)

const historyButton = document.getElementById("historyToggleBtn");
const deliveryList = document.getElementById("deliveryList");

// Read a JSON value from localStorage without crashing on bad data.
function readStorage(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value === null ? fallback : value;
    } catch (error) {
        return fallback;
    }
}

// Escape saved text before putting it in innerHTML.
function esc(text) {
    return String(text === undefined || text === null ? "" : text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ---------- Live clock ----------
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours() % 12 || 12).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const ampm = now.getHours() >= 12 ? "PM" : "AM";
    const clockEl = document.getElementById("liveClock");
    if (clockEl) clockEl.textContent = hours + ":" + minutes + ":" + seconds + " " + ampm;
}

// ---------- Profile + Live Earnings + Past Deliveries ----------
async function loadProfileAndEarnings() {
    let profile = null;
    let user = null;

    try {
        user = await api.me(); // the server's answer is the truth
        if (user) {
            cacheUser(user);
            profile = {
                studentName: user.name,
                enrollmentNo: user.enrollmentNo,
                courseName: user.course,
                batch: user.batch
            };
        }
    } catch (error) {
        profile = readStorage("studentProfile", null);
    }

    if (profile) {
        const nameEl = document.getElementById("profileName");
        const enrollEl = document.getElementById("profileEnrollment");
        const courseEl = document.getElementById("profileCourse");
        const batchEl = document.getElementById("profileBatch");
        if (nameEl) nameEl.textContent = profile.studentName || "Student";
        if (enrollEl) enrollEl.textContent = profile.enrollmentNo || "------";
        if (courseEl) courseEl.textContent = profile.courseName || "------";
        if (batchEl) batchEl.textContent = profile.batch || "------";
    } else {
        const notice = document.getElementById("profileNotice");
        if (notice) {
            notice.textContent = "Could not load your details. Check that the backend is running, then refresh.";
            notice.hidden = false;
        }
    }

    // 1. Live Personal Earnings from Backend
    let totalEarned = 0;
    try {
        const earningsRes = await api.get("/api/users/me/earnings");
        totalEarned = Number(earningsRes.totalEarned) || 0;
    } catch (e) {
        totalEarned = Number(user?.earnings) || 0;
    }
    const earningsEl = document.getElementById("totalEarnings");
    if (earningsEl) earningsEl.textContent = "₹" + totalEarned;

    // 2. Live Past Deliveries (Successful & Failed/Cancelled) from Backend
    let deliveries = [];
    try {
        deliveries = await api.get("/api/users/me/deliveries");
    } catch (e) {
        deliveries = readStorage("completedDeliveries", []);
    }
    renderHistoryList(deliveries);
}

function renderHistoryList(deliveries) {
    if (!deliveryList) return;

    if (!Array.isArray(deliveries) || deliveries.length === 0) {
        deliveryList.innerHTML = '<p class="deliveryEmpty">No past deliveries recorded yet.</p>';
        return;
    }

    let html = "";
    for (let i = 0; i < deliveries.length; i++) {
        const item = deliveries[i];
        const fromLoc = item.pickupLocation || item.fromLocation || item.pickup || "Pickup Point";
        const toLoc = item.dropLocation || item.toLocation || item.destination || "Destination";
        const status = String(item.status || "successful").toLowerCase();
        const isSuccess = (status === "delivered" || status === "successful" || status === "completed");

        let statusBadgeClass = isSuccess ? "isSuccess" : "isFailed";
        let statusLabel = isSuccess ? "Successful" : status === "cancelled" ? "Cancelled" : status === "expired" ? "Expired" : "Failed";
        let rewardText = isSuccess ? `+₹${item.reward || 0}` : `₹0`;

        const dateStr = item.deliveredAt || item.cancelledAt || item.updatedAt || item.createdAt || item.date;
        const formattedDate = dateStr
            ? new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
            : "Recent";
        const parcelName = item.companyName ? `${item.companyName} parcel` : (item.itemDescription || "Parcel delivery");

        html +=
            '<div class="deliveryItem">' +
                '<div class="deliveryInfo">' +
                    '<span class="deliveryRoute">' + esc(fromLoc) + ' &rarr; ' + esc(toLoc) + '</span>' +
                    '<span class="deliveryDate">' + esc(parcelName) + ' &middot; ' + esc(formattedDate) + '</span>' +
                '</div>' +
                '<div class="deliveryStatusGroup">' +
                    '<span class="deliveryReward' + (!isSuccess ? " isMuted" : "") + '">' +
                        esc(rewardText) + '</span>' +
                    '<span class="deliveryBadge ' + statusBadgeClass + '">' +
                        esc(statusLabel) + '</span>' +
                '</div>' +
            '</div>';
    }
    deliveryList.innerHTML = html;
}

// ---------- Show / hide history ----------
function toggleHistory() {
    if (!historyButton || !deliveryList) return;
    const isOpen = historyButton.getAttribute("aria-expanded") === "true";
    deliveryList.hidden = isOpen;
    historyButton.setAttribute("aria-expanded", String(!isOpen));
    historyButton.textContent = isOpen ? "Show History" : "Hide History";
}

if (historyButton) historyButton.addEventListener("click", toggleHistory);
setInterval(updateClock, 1000);
updateClock();
loadProfileAndEarnings();
