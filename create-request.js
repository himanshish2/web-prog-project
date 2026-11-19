// create-request.js - "Create Campus Delivery Request" form (plain JavaScript, localStorage only)

const creationForm = document.getElementById("creationForm");
const profileNotice = document.getElementById("profileNotice");
const submitButton = document.getElementById("submitButton");

// Read a JSON value from localStorage without crashing on bad data.
function readStorage(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value === null ? fallback : value;
    } catch (error) {
        return fallback;
    }
}

// Fill the read-only student fields from the saved profile.
const profile = readStorage("studentProfile", null);
if (profile) {
    document.getElementById("studentName").value = profile.studentName || "";
    document.getElementById("enrollmentNo").value = profile.enrollmentNo || "";
    document.getElementById("batch").value = profile.batch || "";
    document.getElementById("courseName").value = profile.courseName || "";
} else {
    // The read-only fields are required, so the form cannot be sent without a profile.
    profileNotice.hidden = false;
    submitButton.disabled = true;
}

async function handleCreationSubmit(event) {
    event.preventDefault();

    const value = (id) => document.getElementById(id).value;
    const deadline = new Date(value("deadline"));

    if (Number.isNaN(deadline.getTime()) || deadline <= new Date()) {
        alert("Choose a deadline in the future.");
        return;
    }

    submitButton.disabled = true;

    try {
        await api.post("/api/requests", {
            pickupLocation: value("fromLocation"),
            dropLocation: value("toLocation"),
            reward: Number(value("reward")),
            deadline: deadline.toISOString(),
            companyName: value("companyName"),
            agentName: value("agentName"),
            agentMobile: value("agentMobile"),
            pickupOtp: value("pickupOtp"),
            itemDescription: value("itemDescription")
        });

        alert("Delivery Request Published Successfully!");
        window.location.href = "profile.html";
    } catch (error) {
        alert(api.describeError(error));
        submitButton.disabled = false;
    }
}

creationForm.addEventListener("submit", handleCreationSubmit);