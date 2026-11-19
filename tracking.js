// tracking.js — live parcel tracking for the requester and delivery partner

const trackForm = document.getElementById("trackForm");
const parcelInput = document.getElementById("parcelId");
const trackMessage = document.getElementById("trackMessage");
const actionMessage = document.getElementById("actionMessage");
const trackResults = document.getElementById("trackResults");
const emptyState = document.getElementById("emptyState");
const nextButton = document.getElementById("nextButton");
const cancelButton = document.getElementById("cancelButton");
const controls = document.querySelector(".areaControls");

const deliverySteps = [
    { status: "pending", label: "Waiting for Delivery Partner", time: "createdAt" },
    { status: "accepted", label: "Accepted", time: "acceptedAt" },
    { status: "picked_up", label: "Picked Up", time: "pickedUpAt" },
    { status: "out_for_delivery", label: "Out for Delivery", time: "outForDeliveryAt" },
    { status: "delivered", label: "Delivered", time: "deliveredAt" }
];

let viewer;
let parcel;
let busy = false;

document.querySelectorAll(".demoBanner, .demoNote, .roleFieldset")
    .forEach((element) => {
        element.hidden = true;
    });

parcelInput.placeholder = "Enter a parcel request ID";

let messagesSection = document.getElementById("requesterMessages");

if (!messagesSection) {
    messagesSection = document.createElement("section");
    messagesSection.id = "requesterMessages";
    messagesSection.className = "card";
    messagesSection.innerHTML = `
        <h2>Messages from the Requester</h2>
        <p id="messagesNote" role="status"></p>
        <ul id="requesterMessageList" class="historyList"></ul>
    `;
    trackResults.after(messagesSection);
}

messagesSection.hidden = true;

const messagesNote = document.getElementById("messagesNote");
const messageList = document.getElementById("requesterMessageList");

function isAssignedPartner() {
    return Boolean(parcel?.deliveryPartnerId)
        && String(viewer.id) === String(parcel.deliveryPartnerId);
}

function addLine(container, text) {
    const line = document.createElement("p");
    line.textContent = text;
    container.append(line);
}

function clearMessages() {
    messagesSection.hidden = true;
    messagesNote.textContent = "";
    messageList.replaceChildren();
}

function renderParcel() {
    const currentStep = deliverySteps.findIndex((step) => step.status === parcel.status);
    const statusLabel = deliverySteps[currentStep]?.label
        || { cancelled: "Cancelled", expired: "Expired" }[parcel.status]
        || parcel.status;

    const isPartner = isAssignedPartner();
    const isRequester = String(viewer.id) === String(parcel.requesterId);
    const nextStep = currentStep >= 1 ? deliverySteps[currentStep + 1] : undefined;
    const canAdvance = isPartner && Boolean(nextStep);
    const canCancel = isRequester && parcel.status === "pending";

    document.getElementById("trackHeading").textContent =
        isPartner ? "Manage Delivery" : "Track Your Parcel";

    document.querySelector(".trackLead").textContent = isPartner
        ? "Check pickup and drop-off details and update the delivery status."
        : "Follow your parcel as your delivery partner updates its progress.";

    const summary = document.getElementById("summaryBox");
    summary.replaceChildren();
    addLine(summary, `${parcel.companyName} parcel`);
    addLine(summary, `Parcel ID: ${parcel.id}`);
    addLine(summary, `Status: ${statusLabel}`);

    document.querySelector(".areaPartner h2").textContent =
        isPartner ? "Requester" : "Delivery Partner";

    document.getElementById("partnerBox").textContent = isPartner
        ? parcel.requester?.name || "Student"
        : parcel.deliveryPartner?.name || "Waiting for a delivery partner";

    const details = document.getElementById("detailsBox");
    details.replaceChildren();
    addLine(details, `Pickup: ${parcel.pickupLocation}`);
    addLine(details, `Drop-off: ${parcel.dropLocation}`);
    addLine(details, `Reward: ₹${parcel.reward}`);

    if (parcel.itemDescription) addLine(details, parcel.itemDescription);
    if ((isPartner || isRequester) && parcel.agentName) addLine(details, `Courier agent: ${parcel.agentName}`);
    if ((isPartner || isRequester) && parcel.agentMobile) addLine(details, `Agent phone: ${parcel.agentMobile}`);
    if ((isPartner || isRequester) && parcel.pickupOtp) addLine(details, `Pickup code: ${parcel.pickupOtp}`);

    const timeline = document.getElementById("timelineList");
    const history = document.getElementById("historyList");
    timeline.replaceChildren();
    history.replaceChildren();

    deliverySteps.forEach((step, index) => {
        const timestamp = parcel[step.time];
        const item = document.createElement("li");
        item.className = "timelineItem";
        if (timestamp) item.classList.add("isCompleted");
        if (index === currentStep) item.classList.add("isCurrent");

        const marker = document.createElement("span");
        marker.className = "timelineMarker";
        marker.textContent = timestamp ? "✓" : String(index + 1);

        const label = document.createElement("span");
        label.className = "timelineLabel";
        label.textContent = step.label;

        item.append(marker, label);
        timeline.append(item);

        if (timestamp) {
            const entry = document.createElement("li");
            entry.textContent = `${step.label} · ${new Date(timestamp).toLocaleString()}`;
            history.append(entry);
        }
    });

    controls.hidden = !canAdvance && !canCancel;
    nextButton.hidden = !canAdvance;
    nextButton.textContent = canAdvance ? `Mark as ${nextStep.label}` : "";
    nextButton.dataset.status = canAdvance ? nextStep.status : "";
    cancelButton.hidden = !canCancel;

    document.getElementById("controlNote").textContent =
        canAdvance ? "The requester will see your update on their tracking page." : "";

    trackResults.hidden = false;
    emptyState.hidden = true;
}

async function loadRequesterMessages() {
    if (!isAssignedPartner()) {
        clearMessages();
        return;
    }

    messagesSection.hidden = false;

    try {
        const id = encodeURIComponent(parcel.id);
        const messages = await api.get(`/api/requests/${id}/messages`);
        const incoming = messages.filter((message) =>
            String(message.senderId) === String(parcel.requesterId)
            && String(message.receiverId) === String(viewer.id)
        );

        const items = incoming.map((message) => {
            const item = document.createElement("li");
            item.textContent = message.text;
            return item;
        });

        messageList.replaceChildren(...items);
        messagesNote.textContent = items.length ? "" : "No messages yet.";
    } catch (error) {
        messagesNote.textContent = api.describeError(error);
    }
}

async function loadParcel(id) {
    if (busy) return;

    busy = true;
    try {
        parcel = await api.get(`/api/requests/${encodeURIComponent(id)}`);
        trackMessage.textContent = "";
        renderParcel();
        await loadRequesterMessages();
    } catch (error) {
        trackMessage.textContent = api.describeError(error);
    } finally {
        busy = false;
    }
}

async function updateParcel(action, body) {
    if (!parcel || busy) return;

    busy = true;
    nextButton.disabled = true;
    cancelButton.disabled = true;
    actionMessage.textContent = "";
    trackMessage.textContent = "";

    const url = `/api/requests/${encodeURIComponent(parcel.id)}`;

    try {
        parcel = await api.request("PATCH", `${url}/${action}`, body);
        renderParcel();
        await loadRequesterMessages();
    } catch (error) {
        actionMessage.textContent = api.describeError(error);
    } finally {
        busy = false;
        nextButton.disabled = false;
        cancelButton.disabled = false;
    }
}

async function startTracking() {
    try {
        viewer = await api.me();

        if (!viewer) {
            window.location.replace("login.html");
            return;
        }
    } catch (error) {
        trackMessage.textContent = api.describeError(error);
        return;
    }

    trackForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (busy) return;

        const id = parcelInput.value.trim();
        if (!id) {
            trackMessage.textContent = "Enter a parcel request ID.";
            return;
        }

        parcel = null;
        clearMessages();
        actionMessage.textContent = "";
        trackResults.hidden = true;
        emptyState.hidden = false;
        loadParcel(id);
    });

    nextButton.addEventListener("click", () => {
        const status = nextButton.dataset.status;
        if (status) updateParcel("status", { status });
    });

    cancelButton.addEventListener("click", () => {
        if (!busy && window.confirm("Cancel this parcel request?")) {
            updateParcel("cancel");
        }
    });

    const id = new URLSearchParams(window.location.search).get("id");
    if (id) {
        parcelInput.value = id;
        await loadParcel(id);
    }

    setInterval(() => {
        if (parcel) loadParcel(parcel.id);
    }, 5000);
}

startTracking();