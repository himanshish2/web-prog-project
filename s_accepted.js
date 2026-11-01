
const messageForm = document.querySelector("#messageForm");
const nameInput = document.querySelector("#studentName");
const messageInput = document.querySelector("#message");
const feedback = document.querySelector("#formFeedback");
const downloadButton = document.querySelector("#downloadJsonButton");

// Handle message submission.
messageForm.addEventListener("submit", function (event) {
    // Stop the page from refreshing.
    event.preventDefault();

    const studentName = nameInput.value.trim();
    const messageText = messageInput.value.trim();

    // Validate the form.
    if (studentName === "" || messageText === "") {
        showFeedback("Please fill in both fields.", "error");
        return;
    }

    // Create an object containing the submitted data.
    const newMessage = {
        name: studentName,
        message: messageText,
        parcelId: "CC1026",
        runner: "Meera K.",
        submittedAt: new Date().toISOString()
    };

    // Read previously saved messages.
    let savedMessages = [];

    try {
        const storedData = localStorage.getItem("campusCarryMessages");
        savedMessages = storedData ? JSON.parse(storedData) : [];

        if (!Array.isArray(savedMessages)) {
            savedMessages = [];
        }
    } catch (error) {
        showFeedback(
            "Could not read saved messages from browser storage.",
            "error"
        );
        return;
    }

    // Add the new message to the list.
    savedMessages.push(newMessage);

    // Save the complete list in localStorage.
    try {
        localStorage.setItem(
            "campusCarryMessages",
            JSON.stringify(savedMessages)
        );
    } catch (error) {
        showFeedback(
            "Could not save messages in browser storage.",
            "error"
        );
        return;
    }

    // Show confirmation and clear the form.
    showFeedback(
        "Message saved successfully!",
        "success"
    );

    messageForm.reset();
});

// Handle JSON file download separately.
downloadButton.addEventListener("click", function () {
    let savedMessages = [];

    try {
        const storedData = localStorage.getItem("campusCarryMessages");
        savedMessages = storedData ? JSON.parse(storedData) : [];

        if (!Array.isArray(savedMessages)) {
            savedMessages = [];
        }
    } catch (error) {
        showFeedback(
            "Could not read saved messages from browser storage.",
            "error"
        );
        return;
    }

    if (savedMessages.length === 0) {
        showFeedback(
            "There are no saved messages to download yet.",
            "error"
        );
        return;
    }

    // Convert all saved messages into JSON format.
    const jsonData = JSON.stringify(savedMessages, null, 4);

    const file = new Blob(
        [jsonData],
        { type: "application/json" }
    );

    const downloadURL = URL.createObjectURL(file);

    const downloadLink = document.createElement("a");
    downloadLink.href = downloadURL;
    downloadLink.download = "campusCarryMessages.json";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    URL.revokeObjectURL(downloadURL);

    showFeedback(
        "Your JSON file has been downloaded successfully!",
        "success"
    );
});

// Display feedback messages.
function showFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = "formFeedback " + type;
}
