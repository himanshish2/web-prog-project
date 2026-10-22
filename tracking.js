// tracking.js - CampusCarry Parcel Tracking (plain JavaScript, sample data only)
// The mobile menu is in nav.js.

// ---------- 1. DATA ----------
const statuses = ["Waiting for Delivery Partner", "Accepted", "Picked Up", "Out for Delivery", "Delivered"];
const stepNames = ["Request Created", "Delivery Partner Accepted", "Parcel Picked Up", "Out for Delivery", "Delivered"];
const eventText = ["Pickup request created", "Delivery partner accepted", "Parcel picked up", "Out for delivery", "Parcel delivered"];
const nextLabels = ["", "Mark as Picked Up", "Mark as Out for Delivery", "Mark as Delivered"];
const badgeClass = {
    "Waiting for Delivery Partner": "status-waiting",
    "Accepted": "status-accepted",
    "Picked Up": "status-pickedup",
    "Out for Delivery": "status-outfor",
    "Delivered": "status-delivered",
    "Cancelled": "status-cancelled"
};

// The ONE place parcel information is stored. Each parcel is an object.
const parcels = [
    {
        id: "CC1024", status: "Out for Delivery", description: "Clothing order - small box",
        pickup: "Main Gate Delivery Point", delivery: "Hostels", price: 30, date: "11 Oct 2026",
        estimate: "Around 6:45 PM", instructions: "Hand over at the hostel entrance.",
        partner: { name: "Aarav S.", rating: 4.8, deliveries: 32 },
        history: [["5:30 PM", "Pickup request created"], ["5:55 PM", "Delivery partner accepted"],
                  ["6:10 PM", "Parcel picked up"], ["6:20 PM", "Out for delivery"]]
    },
    {
        id: "CC1025", status: "Waiting for Delivery Partner", description: "Two textbooks",
        pickup: "Main Gate Delivery Point", delivery: "Academic Block", price: 20, date: "11 Oct 2026",
        estimate: "Not available yet", instructions: "Meet outside the Academic Block after 4 PM.",
        partner: null,
        history: [["3:40 PM", "Pickup request created"]]
    },
    {
        id: "CC1026", status: "Accepted", description: "Stationery - pens and notebooks",
        pickup: "Library Help Desk", delivery: "Hostels", price: 22, date: "11 Oct 2026",
        estimate: "Around 2:30 PM", instructions: "Ask for the parcel by ID.",
        partner: { name: "Meera K.", rating: 4.9, deliveries: 51 },
        history: [["1:15 PM", "Pickup request created"], ["1:40 PM", "Delivery partner accepted"]]
    },
    {
        id: "CC1027", status: "Delivered", description: "Sports kit bag",
        pickup: "Sports Complex Reception", delivery: "Hostels", price: 25, date: "10 Oct 2026",
        estimate: "Delivered", instructions: "No special instructions.",
        partner: { name: "Ishita M.", rating: 4.7, deliveries: 27 },
        history: [["11:00 AM", "Pickup request created"], ["11:12 AM", "Delivery partner accepted"],
                  ["11:30 AM", "Parcel picked up"], ["11:42 AM", "Out for delivery"], ["11:55 AM", "Parcel delivered"]]
    },
    {
        id: "CC1028", status: "Cancelled", description: "Paperback novel",
        pickup: "Library Help Desk", delivery: "Academic Block", price: 15, date: "10 Oct 2026",
        estimate: "Not applicable", instructions: "Deliver to the front desk.",
        partner: null,
        history: [["9:05 AM", "Pickup request created"], ["9:40 AM", "Request cancelled"]]
    }
];

// ---------- 2. STATE ----------
let current = null;         // the parcel being shown
let role = "receiver";      // demo role: "receiver" or "partner"
// Submitted form data is kept here and in localStorage (browser storage, not a database).
function loadRecords() {
    return JSON.parse(localStorage.getItem("campusCarryRecords") || "[]");
}

// ---------- 3. PAGE ELEMENTS ----------
const form = document.getElementById("trackForm");
const idInput = document.getElementById("parcelId");
const trackMessage = document.getElementById("trackMessage");
const emptyState = document.getElementById("emptyState");
const results = document.getElementById("trackResults");
const summaryBox = document.getElementById("summaryBox");
const timelineList = document.getElementById("timelineList");
const historyList = document.getElementById("historyList");
const partnerBox = document.getElementById("partnerBox");
const detailsBox = document.getElementById("detailsBox");
const cancelButton = document.getElementById("cancelButton");
const nextButton = document.getElementById("nextButton");
const controlNote = document.getElementById("controlNote");
const actionMessage = document.getElementById("actionMessage");
const recordCount = document.getElementById("recordCount");
const downloadButton = document.getElementById("downloadButton");
const roleInputs = document.querySelectorAll("input[name='demoRole']");

// ---------- 4. FUNCTIONS ----------

// Loop through the array and return the matching parcel (or null).
function findParcel(id) {
    for (let i = 0; i < parcels.length; i++) {
        if (parcels[i].id === id) {
            return parcels[i];
        }
    }
    return null;
}

function showMessage(element, text, isError) {
    element.textContent = text;
    element.classList.toggle("isError", isError);
}

function timeNow() {
    return new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toUpperCase();
}

// Save one form record (as an object) and update the counter.
function saveRecord(action, parcelId, result) {
    const records = loadRecords();      // read fresh, so a second open tab never overwrites it
    records.push({ action: action, parcelId: parcelId, result: result, savedAt: new Date().toLocaleString("en-IN") });
    localStorage.setItem("campusCarryRecords", JSON.stringify(records));
    recordCount.textContent = records.length;
}

// Download all saved records as a .json file.
function downloadRecords() {
    const records = loadRecords();
    if (records.length === 0) {
        showMessage(trackMessage, "Nothing saved yet. Track a parcel first.", true);
        return;
    }
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "campuscarry-tracking-data.json";
    link.click();
    URL.revokeObjectURL(link.href);
}

// Draw everything for the current parcel. Called after EVERY change.
function showParcel() {
    const p = current;
    const index = statuses.indexOf(p.status);   // -1 when Cancelled

    // Summary card
    summaryBox.innerHTML =
        '<div class="summaryTop"><h2>Parcel ' + p.id + '</h2>' +
        '<span class="statusBadge ' + badgeClass[p.status] + '">' + p.status + '</span></div>' +
        '<dl class="infoGrid">' +
        '<div><dt>Pickup location</dt><dd>' + p.pickup + '</dd></div>' +
        '<div><dt>Delivery location</dt><dd>' + p.delivery + '</dd></div>' +
        '<div><dt>Offered price</dt><dd>\u20B9' + p.price + '</dd></div>' +
        '<div><dt>Request created</dt><dd>' + p.date + '</dd></div>' +
        '<div><dt>Estimated delivery</dt><dd>' + p.estimate + '</dd></div></dl>';

    // Timeline (list items built in a loop)
    let timeline = "";
    if (p.status === "Cancelled") {
        timeline = '<li class="timelineItem isCancelled"><span class="timelineMarker">\u2715</span>' +
            '<p class="timelineLabel">Request Cancelled</p><p class="timelineNote">This parcel will not be delivered.</p></li>';
    } else {
        for (let n = 0; n < stepNames.length; n++) {
            let state = "isUpcoming", note = "Upcoming", mark = n + 1;
            if (p.status === "Delivered" || n < index) {
                state = "isCompleted"; note = "Completed"; mark = "\u2713";
            } else if (n === index) {
                state = "isCurrent"; note = "Current step";
            }
            timeline += '<li class="timelineItem ' + state + '"><span class="timelineMarker">' + mark + '</span>' +
                '<p class="timelineLabel">' + stepNames[n] + '</p><p class="timelineNote">' + note + '</p></li>';
        }
    }
    timelineList.innerHTML = timeline;

    // Status history (only events that already happened)
    let history = "";
    for (let n = 0; n < p.history.length; n++) {
        history += '<li class="historyItem"><span class="historyTime">' + p.history[n][0] + '</span>' +
            '<span class="historyText">' + p.history[n][1] + '</span></li>';
    }
    historyList.innerHTML = history;

    // Delivery partner
    if (p.partner !== null && p.status !== "Cancelled") {
        partnerBox.innerHTML = '<div class="partnerCard"><div class="partnerAvatar">' + p.partner.name.charAt(0) + '</div>' +
            '<div><p class="partnerName">' + p.partner.name + '</p><p class="partnerBadge">\u2713 Verified student</p>' +
            '<p class="partnerStats">\u2605 ' + p.partner.rating + ' \u2022 ' + p.partner.deliveries + ' completed deliveries</p></div></div>';
    } else {
        partnerBox.innerHTML = '<p class="mutedText">No delivery partner has accepted this request yet.</p>';
    }

    // Parcel details
    detailsBox.innerHTML = '<dl class="detailList">' +
        '<div><dt>Parcel ID</dt><dd>' + p.id + '</dd></div>' +
        '<div><dt>Description</dt><dd>' + p.description + '</dd></div>' +
        '<div><dt>Pickup / Delivery</dt><dd>' + p.pickup + ' \u2192 ' + p.delivery + '</dd></div>' +
        '<div><dt>Offered price</dt><dd>\u20B9' + p.price + '</dd></div>' +
        '<div><dt>Instructions</dt><dd>' + p.instructions + '</dd></div></dl>';

    showControls();
    emptyState.hidden = true;
    results.hidden = false;
}

// Show the buttons that match the demo role and the parcel's status.
function showControls() {
    const index = statuses.indexOf(current.status);
    const canCancel = (index === 0 || index === 1);                       // before pickup only
    const canMove = (current.partner !== null && index >= 1 && index <= 3);

    cancelButton.hidden = (role === "partner");
    nextButton.hidden = (role === "receiver" || !canMove);
    cancelButton.disabled = !canCancel;
    nextButton.textContent = canMove ? nextLabels[index] : "";

    if (role === "receiver") {
        controlNote.textContent = canCancel ? "You can cancel until the parcel is picked up."
                                            : "This request can no longer be cancelled.";
    } else {
        controlNote.textContent = canMove ? "Next status: " + statuses[index + 1] + "."
                                          : "No delivery action is available for this parcel.";
    }
}

// Form submit: validate, search, then show the parcel or an error.
function handleTrackingSubmit(event) {
    event.preventDefault();                                   // no page reload
    const id = idInput.value.trim().toUpperCase();
    idInput.value = id;
    showMessage(actionMessage, "", false);

    let error = "";
    let parcel = null;
    if (id === "") {
        error = "Please enter a parcel ID.";
    } else if (!/^CC[0-9]{4}$/.test(id)) {
        error = "Parcel IDs look like CC1024 (CC followed by 4 digits).";
    } else {
        parcel = findParcel(id);
        if (parcel === null) {
            error = "No parcel found with ID " + id + ".";
        }
    }

    if (id !== "") {
        saveRecord("search", id, parcel !== null ? "found" : "not found");
    }

    idInput.classList.toggle("hasError", error !== "");
    if (error !== "") {
        current = null;
        showMessage(trackMessage, error, true);
        results.hidden = true;
        emptyState.hidden = false;
        return;
    }
    current = parcel;
    showMessage(trackMessage, "Showing parcel " + id + ".", false);
    showParcel();
}

// Delivery partner: move to the next valid status.
function moveToNextStatus() {
    const index = statuses.indexOf(current.status);
    if (role !== "partner" || current.partner === null || index < 1 || index > 3) {
        showMessage(actionMessage, "This update is not allowed.", true);
        return;
    }
    if (index === 3 && !confirm("Mark parcel " + current.id + " as delivered?")) {
        return;
    }
    current.status = statuses[index + 1];
    current.history.push([timeNow(), eventText[index + 1]]);
    if (current.status === "Delivered") {
        current.estimate = "Delivered";
    }
    saveRecord("status update", current.id, current.status);
    showParcel();
    showMessage(actionMessage, "Status updated to " + current.status + ".", false);
}

// Parcel receiver: cancel, only before pickup.
function cancelParcel() {
    const index = statuses.indexOf(current.status);
    if (role !== "receiver" || index < 0 || index > 1) {
        showMessage(actionMessage, "This request cannot be cancelled.", true);
        return;
    }
    if (!confirm("Cancel request " + current.id + "?")) {
        return;
    }
    current.status = "Cancelled";
    current.estimate = "Not applicable";
    current.history.push([timeNow(), "Request cancelled"]);
    saveRecord("cancel", current.id, "Cancelled");
    showParcel();
    showMessage(actionMessage, "Request " + current.id + " has been cancelled.", false);
}

function changeRole(event) {
    role = event.target.value;
    showMessage(actionMessage, "", false);
    if (current !== null) {
        showControls();
    }
}

// ---------- 5. EVENTS ----------
form.addEventListener("submit", handleTrackingSubmit);
nextButton.addEventListener("click", moveToNextStatus);
cancelButton.addEventListener("click", cancelParcel);
downloadButton.addEventListener("click", downloadRecords);
for (let i = 0; i < roleInputs.length; i++) {
    roleInputs[i].addEventListener("change", changeRole);
}
role = document.querySelector("input[name='demoRole']:checked").value;
recordCount.textContent = loadRecords().length;