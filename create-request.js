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

function handleCreationSubmit(event) {
    event.preventDefault();

    const existingRequests = readStorage("campusRequests", []);

    const newRequest = {
        id: "REQ" + Date.now().toString().slice(-6),
        studentName: document.getElementById("studentName").value,
        enrollmentNo: document.getElementById("enrollmentNo").value,
        batch: document.getElementById("batch").value,
        courseName: document.getElementById("courseName").value,
        reward: document.getElementById("reward").value,
        deadline: document.getElementById("deadline").value,
        fromLocation: document.getElementById("fromLocation").value,
        toLocation: document.getElementById("toLocation").value,
        companyName: document.getElementById("companyName").value,
        agentName: document.getElementById("agentName").value,
        agentMobile: document.getElementById("agentMobile").value,
        pickupOtp: document.getElementById("pickupOtp").value,
        itemDescription: document.getElementById("itemDescription").value,
        createdAt: new Date().toISOString()
    };

    existingRequests.push(newRequest);
    localStorage.setItem("campusRequests", JSON.stringify(existingRequests));

    alert("Delivery Request Published Successfully!");
    window.location.href = "profile.html";
}

creationForm.addEventListener("submit", handleCreationSubmit);
