// profile.js - student profile page (plain JavaScript, localStorage only)

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
    document.getElementById("liveClock").textContent = hours + ":" + minutes + ":" + seconds + " " + ampm;
}

// ---------- Profile + earnings ----------
function loadProfileAndEarnings() {
    const profile = readStorage("studentProfile", null);
    if (profile) {
        document.getElementById("profileName").textContent = profile.studentName;
        document.getElementById("profileEnrollment").textContent = profile.enrollmentNo;
        document.getElementById("profileCourse").textContent = profile.courseName;
        document.getElementById("profileBatch").textContent = profile.batch;
    }

    const completedDeliveries = readStorage("completedDeliveries", []);

    // Only successful / completed deliveries add to the earnings.
    const earnedAmount = completedDeliveries.reduce(function (sum, task) {
        const status = (task.status || "successful").toLowerCase();
        if (status === "successful" || status === "completed") {
            return sum + (Number(task.reward) || 0);
        }
        return sum;
    }, 0);

    document.getElementById("totalEarnings").textContent = "\u20B9" + earnedAmount;
    renderHistoryList(completedDeliveries);
}

function renderHistoryList(deliveries) {
    if (deliveries.length === 0) {
        deliveryList.innerHTML = '<p class="deliveryEmpty">No past deliveries recorded yet.</p>';
        return;
    }

    let html = "";
    for (let i = 0; i < deliveries.length; i++) {
        const item = deliveries[i];
        const fromLoc = item.fromLocation || item.pickup || "Pickup Point";
        const toLoc = item.toLocation || item.destination || item.dropoff || "Destination";
        const status = (item.status || "successful").toLowerCase();
        const isFailed = (status === "cancelled" || status === "failed");

        html +=
            '<div class="deliveryItem">' +
                '<div class="deliveryInfo">' +
                    '<span class="deliveryRoute">' + esc(fromLoc) + ' &rarr; ' + esc(toLoc) + '</span>' +
                    '<span class="deliveryDate">' + esc(item.date || item.createdAt || "Today") + '</span>' +
                '</div>' +
                '<div class="deliveryStatusGroup">' +
                    '<span class="deliveryReward' + (isFailed ? " isMuted" : "") + '">' +
                        (isFailed ? "\u20B90" : "+\u20B9" + esc(item.reward || 0)) + '</span>' +
                    '<span class="deliveryBadge ' + (isFailed ? "isFailed" : "isSuccess") + '">' +
                        (isFailed ? "Cancelled" : "Successful") + '</span>' +
                '</div>' +
            '</div>';
    }
    deliveryList.innerHTML = html;
}

// ---------- Show / hide history ----------
function toggleHistory() {
    const isOpen = historyButton.getAttribute("aria-expanded") === "true";
    deliveryList.hidden = isOpen;
    historyButton.setAttribute("aria-expanded", String(!isOpen));
    historyButton.textContent = isOpen ? "Show History" : "Hide History";
}

historyButton.addEventListener("click", toggleHistory);
setInterval(updateClock, 1000);
updateClock();
loadProfileAndEarnings();
