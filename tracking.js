// tracking.js - CampusCarry Parcel Tracking (frontend demo, plain JavaScript)
// The mobile menu is handled separately in nav.js.
//
// HOW THIS FILE IS ORGANISED
//   1. Data       - statuses and the sample parcels (the single source of truth)
//   2. State      - which parcel and which demo role are selected
//   3. DOM        - references to page elements
//   4. Helpers    - small functions (find a parcel, format things)
//   5. Rendering  - functions that draw one part of the page each
//   6. Actions    - search, cancel, advance status
//   7. Events     - connect buttons / form to the actions

// ============================================================
// 1. DATA
// ============================================================

// The delivery stages, in order. The position (index) in this array matters:
// "Accepted" is index 1, "Out for Delivery" is index 3, and so on.
const statusFlow = [
    "Waiting for Delivery Partner",
    "Accepted",
    "Picked Up",
    "Out for Delivery",
    "Delivered"
];

// Labels shown in the timeline (same order as statusFlow).
const stageLabels = [
    "Request Created",
    "Delivery Partner Accepted",
    "Parcel Picked Up",
    "Out for Delivery",
    "Delivered"
];

// Text used in the status history (same order as statusFlow).
const historyText = [
    "Pickup request created",
    "Delivery partner accepted",
    "Parcel picked up",
    "Marked as out for delivery",
    "Parcel delivered"
];

// Which CSS class styles each status badge.
const statusClasses = {
    "Waiting for Delivery Partner": "status-waiting",
    "Accepted": "status-accepted",
    "Picked Up": "status-pickedup",
    "Out for Delivery": "status-outfor",
    "Delivered": "status-delivered",
    "Cancelled": "status-cancelled"
};

// A short sentence for each status. These describe what has been
// RECORDED, not where the parcel physically is (there is no GPS here).
const statusMessages = {
    "Waiting for Delivery Partner": "This request is waiting for a delivery partner to accept it.",
    "Accepted": "A delivery partner has accepted this request. The parcel has not been picked up yet.",
    "Picked Up": "The delivery partner has marked this parcel as picked up.",
    "Out for Delivery": "The delivery partner has marked this parcel as out for delivery.",
    "Delivered": "The delivery partner has marked this parcel as delivered.",
    "Cancelled": "This request was cancelled. No delivery will take place."
};

// The button label that moves a parcel FROM a status to the next one.
const advanceLabels = {
    "Accepted": "Mark as Picked Up",
    "Picked Up": "Mark as Out for Delivery",
    "Out for Delivery": "Mark as Delivered"
};

// Sample parcels. Each parcel is an object.
//   status : one of the statuses above (this is the ONE place the status is stored)
//   times  : the time each stage happened (same order as statusFlow, null = not yet)
//   partner: the delivery partner object, or null if nobody accepted yet
const parcelData = [
    {
        id: "CC1024",
        status: "Out for Delivery",
        description: "Clothing order - small sealed box",
        pickupLocation: "Main Gate Delivery Point",
        deliveryLocation: "Hostels",
        price: 30,
        createdDate: "11 Oct 2026",
        estimatedDelivery: "Around 6:45 PM",
        instructions: "Hand the parcel over at the hostel entrance. Please keep it dry.",
        partner: { name: "Aarav S.", rating: 4.8, deliveries: 32 },
        times: ["5:30 PM", "5:55 PM", "6:10 PM", "6:20 PM", null],
        cancelledTime: null
    },
    {
        id: "CC1025",
        status: "Waiting for Delivery Partner",
        description: "Two textbooks in a paper bag",
        pickupLocation: "Main Gate Delivery Point",
        deliveryLocation: "Academic Block",
        price: 20,
        createdDate: "11 Oct 2026",
        estimatedDelivery: null,
        instructions: "Meet outside the Academic Block entrance after 4 PM.",
        partner: null,
        times: ["3:40 PM", null, null, null, null],
        cancelledTime: null
    },
    {
        id: "CC1026",
        status: "Accepted",
        description: "Stationery - pen set and notebooks",
        pickupLocation: "Library Help Desk",
        deliveryLocation: "Hostels",
        price: 22,
        createdDate: "11 Oct 2026",
        estimatedDelivery: "Around 2:30 PM",
        instructions: "Pick up from the help desk and ask for the parcel by ID.",
        partner: { name: "Meera K.", rating: 4.9, deliveries: 51 },
        times: ["1:15 PM", "1:40 PM", null, null, null],
        cancelledTime: null
    },
    {
        id: "CC1027",
        status: "Picked Up",
        description: "Small package - phone accessories",
        pickupLocation: "Main Gate Delivery Point",
        deliveryLocation: "Cafeteria",
        price: 18,
        createdDate: "11 Oct 2026",
        estimatedDelivery: "Around 5:00 PM",
        instructions: "Hand over at the cafeteria entrance.",
        partner: { name: "Rohan T.", rating: 4.6, deliveries: 14 },
        times: ["4:05 PM", "4:20 PM", "4:35 PM", null, null],
        cancelledTime: null
    },
    {
        id: "CC1028",
        status: "Delivered",
        description: "Sports kit bag",
        pickupLocation: "Sports Complex Reception",
        deliveryLocation: "Hostels",
        price: 25,
        createdDate: "10 Oct 2026",
        estimatedDelivery: "Around 12:00 PM",
        instructions: "No special instructions.",
        partner: { name: "Ishita M.", rating: 4.7, deliveries: 27 },
        times: ["11:00 AM", "11:12 AM", "11:30 AM", "11:42 AM", "11:55 AM"],
        cancelledTime: null
    },
    {
        id: "CC1029",
        status: "Cancelled",
        description: "Paperback novel",
        pickupLocation: "Library Help Desk",
        deliveryLocation: "Academic Block",
        price: 15,
        createdDate: "10 Oct 2026",
        estimatedDelivery: null,
        instructions: "Deliver to the front desk.",
        partner: null,
        times: ["9:05 AM", null, null, null, null],
        cancelledTime: "9:40 AM"
    }
];

// ============================================================
// 2. STATE
// ============================================================

let currentParcel = null;      // the parcel object being shown (a reference into parcelData)
let currentRole = "receiver";  // demo role: "receiver" or "partner"

// ============================================================
// 3. DOM ELEMENTS
// ============================================================

const trackForm = document.getElementById("trackForm");
const parcelIdInput = document.getElementById("parcelId");
const trackMessage = document.getElementById("trackMessage");
const sampleChips = document.querySelectorAll(".chip");

const emptyState = document.getElementById("emptyState");
const trackResults = document.getElementById("trackResults");

const summaryId = document.getElementById("summaryId");
const statusBadge = document.getElementById("statusBadge");
const statusMessage = document.getElementById("statusMessage");
const summaryPickup = document.getElementById("summaryPickup");
const summaryDelivery = document.getElementById("summaryDelivery");
const summaryPrice = document.getElementById("summaryPrice");
const summaryCreated = document.getElementById("summaryCreated");
const summaryEstimate = document.getElementById("summaryEstimate");

const timelineList = document.getElementById("timelineList");
const historyList = document.getElementById("historyList");

const partnerCard = document.getElementById("partnerCard");
const partnerAvatar = document.getElementById("partnerAvatar");
const partnerName = document.getElementById("partnerName");
const partnerStats = document.getElementById("partnerStats");
const partnerEmpty = document.getElementById("partnerEmpty");

const detailId = document.getElementById("detailId");
const detailDescription = document.getElementById("detailDescription");
const detailPickup = document.getElementById("detailPickup");
const detailDelivery = document.getElementById("detailDelivery");
const detailPrice = document.getElementById("detailPrice");
const detailInstructions = document.getElementById("detailInstructions");

const roleInputs = document.querySelectorAll("input[name='demoRole']");
const receiverControls = document.getElementById("receiverControls");
const partnerControls = document.getElementById("partnerControls");
const cancelButton = document.getElementById("cancelButton");
const advanceButton = document.getElementById("advanceButton");
const receiverNote = document.getElementById("receiverNote");
const partnerNote = document.getElementById("partnerNote");
const actionMessage = document.getElementById("actionMessage");

// ============================================================
// 4. HELPERS
// ============================================================

// Look through parcelData with a loop and return the matching parcel (or null).
function findParcel(id) {
    for (let i = 0; i < parcelData.length; i++) {
        if (parcelData[i].id === id) {
            return parcelData[i];
        }
    }
    return null;
}

// Check what the user typed. Returns an error message, or "" if it looks fine.
function validateParcelId(id) {
    if (id === "") {
        return "Please enter a parcel ID.";
    }
    // CC followed by exactly 4 digits, for example CC1024
    const idPattern = /^CC[0-9]{4}$/;
    if (!idPattern.test(id)) {
        return "Parcel IDs look like CC1024 (the letters CC followed by 4 digits).";
    }
    return "";
}

function formatPrice(amount) {
    return "\u20B9" + amount;
}

// Current time such as "6:25 PM" (used when the status changes).
function getCurrentTime() {
    return new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toUpperCase();
}

// Show a message under the search box. isError turns it red.
function showTrackMessage(text, isError) {
    trackMessage.textContent = text;
    if (isError) {
        trackMessage.classList.add("isError");
        parcelIdInput.classList.add("hasError");
        parcelIdInput.setAttribute("aria-invalid", "true");
    } else {
        trackMessage.classList.remove("isError");
        parcelIdInput.classList.remove("hasError");
        parcelIdInput.removeAttribute("aria-invalid");
    }
}

// Show a message in the controls card (after cancel / status update).
function showActionMessage(text, isError) {
    actionMessage.textContent = text;
    if (isError) {
        actionMessage.classList.add("isError");
    } else {
        actionMessage.classList.remove("isError");
    }
}

// Returns the next status a delivery partner may set, or null if none is allowed.
// This is the rule that stops invalid transitions.
function getNextStatus(parcel) {
    if (parcel.partner === null) {
        return null;                       // nobody has accepted the request
    }
    const index = statusFlow.indexOf(parcel.status);   // -1 for "Cancelled"
    if (index >= 1 && index < statusFlow.length - 1) {
        return statusFlow[index + 1];
    }
    return null;                           // waiting, delivered or cancelled
}

// A receiver may cancel only before pickup.
function canCancel(parcel) {
    return parcel.status === "Waiting for Delivery Partner" || parcel.status === "Accepted";
}

// ============================================================
// 5. RENDERING (each function updates one part of the page)
// ============================================================

// Fill the summary card.
function renderSummary(parcel) {
    summaryId.textContent = parcel.id;
    summaryPickup.textContent = parcel.pickupLocation;
    summaryDelivery.textContent = parcel.deliveryLocation;
    summaryPrice.textContent = formatPrice(parcel.price);
    summaryCreated.textContent = parcel.createdDate;

    statusBadge.textContent = parcel.status;
    // Replace the old status class with the right one.
    statusBadge.className = "statusBadge " + statusClasses[parcel.status];
    statusMessage.textContent = statusMessages[parcel.status];

    if (parcel.status === "Delivered") {
        summaryEstimate.textContent = "Delivered at " + parcel.times[4];
    } else if (parcel.status === "Cancelled") {
        summaryEstimate.textContent = "Not applicable (request cancelled)";
    } else if (parcel.estimatedDelivery !== null) {
        summaryEstimate.textContent = parcel.estimatedDelivery;
    } else {
        summaryEstimate.textContent = "Available once a partner accepts";
    }
}

// Build the timeline from scratch every time. One list item per stage.
function updateTimeline(parcel) {
    timelineList.innerHTML = "";

    const isCancelled = parcel.status === "Cancelled";
    const isDelivered = parcel.status === "Delivered";
    const currentIndex = statusFlow.indexOf(parcel.status);

    for (let i = 0; i < stageLabels.length; i++) {
        let state;       // "isCompleted", "isCurrent", "isUpcoming" or "isNotReached"
        let noteText;
        let markerText = String(i + 1);

        if (isCancelled) {
            // Only stages that really happened before the cancellation count as done.
            if (parcel.times[i] !== null) {
                state = "isCompleted";
            } else {
                state = "isNotReached";
            }
        } else if (isDelivered || i < currentIndex) {
            state = "isCompleted";
        } else if (i === currentIndex) {
            state = "isCurrent";
        } else {
            state = "isUpcoming";
        }

        if (state === "isCompleted") {
            markerText = "\u2713";
            noteText = parcel.times[i] !== null ? "Completed at " + parcel.times[i] : "Completed";
        } else if (state === "isCurrent") {
            noteText = i === 0 ? "Current step - waiting for a delivery partner" : "Current step";
        } else if (state === "isNotReached") {
            noteText = "Not reached";
        } else {
            noteText = "Upcoming";
        }

        const item = document.createElement("li");
        item.className = "timelineItem " + state;
        if (state === "isCurrent") {
            item.setAttribute("aria-current", "step");
        }

        const marker = document.createElement("span");
        marker.className = "timelineMarker";
        marker.setAttribute("aria-hidden", "true");
        marker.textContent = markerText;

        const label = document.createElement("p");
        label.className = "timelineLabel";
        label.textContent = stageLabels[i];

        const note = document.createElement("p");
        note.className = "timelineNote";
        note.textContent = noteText;

        item.appendChild(marker);
        item.appendChild(label);
        item.appendChild(note);
        timelineList.appendChild(item);
    }

    // A cancelled parcel gets an extra, clearly marked final step.
    if (isCancelled) {
        const cancelItem = document.createElement("li");
        cancelItem.className = "timelineItem isCancelled";

        const marker = document.createElement("span");
        marker.className = "timelineMarker";
        marker.setAttribute("aria-hidden", "true");
        marker.textContent = "\u2715";

        const label = document.createElement("p");
        label.className = "timelineLabel";
        label.textContent = "Request Cancelled";

        const note = document.createElement("p");
        note.className = "timelineNote";
        note.textContent = "Cancelled at " + parcel.cancelledTime;

        cancelItem.appendChild(marker);
        cancelItem.appendChild(label);
        cancelItem.appendChild(note);
        timelineList.appendChild(cancelItem);
    }
}

// Status history: only events that have ALREADY happened (they have a time).
function renderHistory(parcel) {
    historyList.innerHTML = "";

    for (let i = 0; i < statusFlow.length; i++) {
        if (parcel.times[i] !== null) {
            addHistoryItem(parcel.times[i], historyText[i], false);
        }
    }

    if (parcel.status === "Cancelled") {
        addHistoryItem(parcel.cancelledTime, "Request cancelled", true);
    }
}

function addHistoryItem(time, text, isCancelledEvent) {
    const item = document.createElement("li");
    item.className = "historyItem";
    if (isCancelledEvent) {
        item.classList.add("isCancelledEvent");
    }

    const timeSpan = document.createElement("span");
    timeSpan.className = "historyTime";
    timeSpan.textContent = time;

    const textSpan = document.createElement("span");
    textSpan.className = "historyText";
    textSpan.textContent = text;

    item.appendChild(timeSpan);
    item.appendChild(textSpan);
    historyList.appendChild(item);
}

// Delivery partner card (or a message when there is none).
function renderPartner(parcel) {
    if (parcel.partner !== null && parcel.status !== "Cancelled") {
        partnerCard.hidden = false;
        partnerEmpty.hidden = true;
        partnerAvatar.textContent = parcel.partner.name.charAt(0);
        partnerName.textContent = parcel.partner.name;
        partnerStats.textContent = "\u2605 " + parcel.partner.rating + " rating \u2022 " +
            parcel.partner.deliveries + " completed deliveries";
    } else {
        partnerCard.hidden = true;
        partnerEmpty.hidden = false;
        if (parcel.status === "Cancelled") {
            partnerEmpty.textContent = "This request was cancelled, so no delivery partner is assigned.";
        } else {
            partnerEmpty.textContent = "No delivery partner has accepted this request yet.";
        }
    }
}

function renderDetails(parcel) {
    detailId.textContent = parcel.id;
    detailDescription.textContent = parcel.description;
    detailPickup.textContent = parcel.pickupLocation;
    detailDelivery.textContent = parcel.deliveryLocation;
    detailPrice.textContent = formatPrice(parcel.price);
    detailInstructions.textContent = parcel.instructions;
}

// Show the correct controls for the selected demo role and the parcel's status.
function updateControls(parcel) {
    if (currentRole === "receiver") {
        receiverControls.hidden = false;
        partnerControls.hidden = true;

        cancelButton.disabled = !canCancel(parcel);

        if (canCancel(parcel)) {
            receiverNote.textContent = "You can cancel this request until the parcel has been picked up.";
        } else if (parcel.status === "Cancelled") {
            receiverNote.textContent = "This request has already been cancelled.";
        } else if (parcel.status === "Delivered") {
            receiverNote.textContent = "This parcel has been delivered, so it can no longer be cancelled.";
        } else {
            receiverNote.textContent = "The parcel has already been picked up, so cancelling is no longer possible.";
        }
    } else {
        receiverControls.hidden = true;
        partnerControls.hidden = false;

        const nextStatus = getNextStatus(parcel);

        if (nextStatus !== null) {
            advanceButton.hidden = false;
            advanceButton.textContent = advanceLabels[parcel.status];
            partnerNote.textContent = "Next status: " + nextStatus + ".";
        } else {
            advanceButton.hidden = true;
            if (parcel.status === "Cancelled") {
                partnerNote.textContent = "This request was cancelled, so there is nothing to update.";
            } else if (parcel.status === "Delivered") {
                partnerNote.textContent = "This parcel is already delivered. There are no more steps.";
            } else {
                partnerNote.textContent = "No delivery partner has accepted this request yet, so there are no delivery controls.";
            }
        }
    }
}

// Redraw EVERY part of the page from the parcel object.
// Every change to a parcel ends by calling this, so the page cannot get out of sync.
function renderParcel(parcel) {
    renderSummary(parcel);
    updateTimeline(parcel);
    renderHistory(parcel);
    renderPartner(parcel);
    renderDetails(parcel);
    updateControls(parcel);

    emptyState.hidden = true;
    trackResults.hidden = false;
}

// ============================================================
// 6. ACTIONS
// ============================================================

// Validate the ID, look it up, then show the parcel or an error.
function searchParcel(rawId) {
    const id = rawId.trim().toUpperCase();     // "cc1024 " becomes "CC1024"
    parcelIdInput.value = id;
    showActionMessage("", false);

    const problem = validateParcelId(id);
    if (problem !== "") {
        showError(problem);
        return;
    }

    const parcel = findParcel(id);
    if (parcel === null) {
        showError("No parcel found with ID " + id + ". Please check the ID and try again.");
        return;
    }

    currentParcel = parcel;
    showTrackMessage("Showing parcel " + id + ".", false);
    renderParcel(parcel);
}

function showError(text) {
    currentParcel = null;
    showTrackMessage(text, true);
    trackResults.hidden = true;
    emptyState.hidden = false;
}

// Form submit (Track button OR Enter key).
function handleTrackingSubmit(event) {
    event.preventDefault();                    // stop the page reloading
    searchParcel(parcelIdInput.value);
}

// Delivery partner: move the parcel to the next valid status.
function updateDeliveryStatus() {
    if (currentParcel === null) {
        return;
    }
    if (currentRole !== "partner") {
        showActionMessage("Only a delivery partner can update the delivery status.", true);
        return;
    }

    const nextStatus = getNextStatus(currentParcel);
    if (nextStatus === null) {
        showActionMessage("This parcel cannot be moved to another status right now.", true);
        return;
    }

    if (nextStatus === "Delivered") {
        const sure = confirm("Mark parcel " + currentParcel.id + " as delivered? This completes the delivery.");
        if (!sure) {
            return;
        }
    }

    currentParcel.status = nextStatus;
    currentParcel.times[statusFlow.indexOf(nextStatus)] = getCurrentTime();

    renderParcel(currentParcel);
    showActionMessage("Status updated to \"" + nextStatus + "\".", false);
}

// Parcel receiver: cancel the request (only before pickup).
function cancelParcel() {
    if (currentParcel === null) {
        return;
    }
    if (currentRole !== "receiver") {
        showActionMessage("Only the parcel receiver can cancel a request.", true);
        return;
    }
    if (!canCancel(currentParcel)) {
        showActionMessage("This request can no longer be cancelled.", true);
        return;
    }

    const sure = confirm("Cancel request " + currentParcel.id + "? This cannot be undone.");
    if (!sure) {
        return;
    }

    currentParcel.status = "Cancelled";
    currentParcel.cancelledTime = getCurrentTime();

    renderParcel(currentParcel);
    showActionMessage("Request " + currentParcel.id + " has been cancelled.", false);
}

// Demo role radio buttons.
function handleRoleChange(event) {
    currentRole = event.target.value;
    showActionMessage("", false);
    if (currentParcel !== null) {
        updateControls(currentParcel);
    }
}

// ============================================================
// 7. EVENTS
// ============================================================

// Browsers sometimes restore a ticked radio button after a refresh,
// so read the role from the page instead of assuming it.
currentRole = document.querySelector("input[name='demoRole']:checked").value;

trackForm.addEventListener("submit", handleTrackingSubmit);

for (let i = 0; i < sampleChips.length; i++) {
    sampleChips[i].addEventListener("click", function () {
        searchParcel(sampleChips[i].dataset.id);
    });
}

for (let i = 0; i < roleInputs.length; i++) {
    roleInputs[i].addEventListener("change", handleRoleChange);
}

advanceButton.addEventListener("click", updateDeliveryStatus);
cancelButton.addEventListener("click", cancelParcel);

// If the page is opened as tracking.html?id=CC1024, search straight away.
// (A dashboard "Track" link could use this later.)
const urlParams = new URLSearchParams(window.location.search);
const idFromUrl = urlParams.get("id");
if (idFromUrl !== null) {
    searchParcel(idFromUrl);
}
