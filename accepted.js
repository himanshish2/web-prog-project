// accepted.js — requester view of an accepted parcel

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("message");
const nameInput = document.getElementById("studentName");
const feedback = document.getElementById("formFeedback");
const sendButton = messageForm.querySelector('button[type="submit"]');
const downloadButton = document.getElementById("downloadJsonButton");

const parcelIdField = document.getElementById("parcelId");
const detailsCard = parcelIdField.closest(".acceptCard");
const runnerCard = document.querySelector(".runnerInfo").closest(".acceptCard");
const successCard = document.querySelector(".successCard");
const trackingLink = runnerCard.querySelector("a");

const parcelId = new URLSearchParams(window.location.search).get("id");
const parcelUrl = parcelId
    ? `/api/requests/${encodeURIComponent(parcelId)}`
    : null;
const trackingUrl = `tracking.html?id=${encodeURIComponent(parcelId || "")}`;

const statusLabels = {
    accepted: "Accepted",
    picked_up: "Picked Up",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
    expired: "Expired"
};

const messagingStatuses = new Set([
    "accepted",
    "picked_up",
    "out_for_delivery"
]);

const pageMessage = document.createElement("p");
pageMessage.setAttribute("role", "status");
successCard.before(pageMessage);

const cards = [
    successCard,
    detailsCard,
    runnerCard,
    messageForm.closest(".acceptCard")
];

for (const card of cards) card.hidden = true;
pageMessage.textContent = "Loading parcel details…";
sendButton.disabled = true;

function showFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = `formFeedback ${type}`;
}

function renderParcel(parcel, viewer) {
    const values = [
        parcel.id,
        parcel.itemDescription || `${parcel.companyName} parcel`,
        parcel.pickupLocation,
        parcel.dropLocation,
        `₹${parcel.reward}`
    ];

    detailsCard.querySelectorAll(".detailRow strong").forEach((field, index) => {
        field.textContent = values[index];
    });

    successCard.querySelector(".statusBadge").textContent =
        statusLabels[parcel.status] || parcel.status;

    runnerCard.querySelector("h2").textContent =
        parcel.deliveryPartner?.name || "Assigned delivery partner";
    runnerCard.querySelector(".runnerInfo").hidden = true;
    runnerCard.querySelector(".helperText").textContent =
        "Open Tracking to see the latest delivery status.";

    trackingLink.href = trackingUrl;

    nameInput.value = viewer.name || "";
    nameInput.readOnly = true;

    const canMessage = messagingStatuses.has(parcel.status);
    sendButton.disabled = !canMessage;
    messageInput.disabled = !canMessage;

    if (!canMessage) {
        showFeedback("Messaging is closed for this parcel.", "error");
    }

    for (const card of cards) card.hidden = false;
    pageMessage.hidden = true;
}

messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sendButton.disabled) return;

    const text = messageInput.value.trim();
    if (!text) {
        showFeedback("Enter a message before sending.", "error");
        messageInput.focus();
        return;
    }

    sendButton.disabled = true;

    try {
        await api.post(`${parcelUrl}/messages`, { text });
        messageInput.value = "";
        showFeedback("Message sent to your runner.", "success");
    } catch (error) {
        showFeedback(api.describeError(error), "error");
    } finally {
        sendButton.disabled = false;
    }
});

downloadButton.addEventListener("click", async () => {
    downloadButton.disabled = true;

    try {
        const messages = await api.get(`${parcelUrl}/messages`);

        if (messages.length === 0) {
            showFeedback("There are no messages for this parcel yet.", "error");
            return;
        }

        const file = new Blob(
            [JSON.stringify(messages, null, 2)],
            { type: "application/json" }
        );
        const downloadUrl = URL.createObjectURL(file);
        const link = document.createElement("a");

        link.href = downloadUrl;
        link.download = `campuscarry-messages-${parcelId}.json`;
        document.body.append(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        showFeedback("Messages downloaded.", "success");
    } catch (error) {
        showFeedback(api.describeError(error), "error");
    } finally {
        downloadButton.disabled = false;
    }
});

async function loadAcceptedPage() {
    if (!parcelUrl) {
        pageMessage.textContent =
            "Open an accepted parcel from My Activity to see its details.";
        return;
    }

    try {
        const viewer = await api.me();

        if (!viewer) {
            window.location.replace("login.html");
            return;
        }

        const parcel = await api.get(parcelUrl);

        if (viewer.id === parcel.deliveryPartnerId) {
            window.location.replace(trackingUrl);
            return;
        }

        if (viewer.id !== parcel.requesterId || !parcel.deliveryPartnerId) {
            pageMessage.textContent =
                "This page is available to the requester once a runner is assigned.";
            return;
        }

        renderParcel(parcel, viewer);
    } catch (error) {
        pageMessage.textContent = api.describeError(error);
    }
}

loadAcceptedPage();