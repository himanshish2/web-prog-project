// create-request.js - "Create Campus Delivery Request" form with live backend integration

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

function showNotice(text, isError = true) {
    if (!profileNotice) return;
    profileNotice.textContent = text;
    profileNotice.hidden = !text;
    profileNotice.style.color = isError ? "#b91c1c" : "#15803d";
}

// Fill student fields from cache, or fetch from live backend session
async function initStudentProfile() {
    let profile = readStorage("studentProfile", null);

    if (!profile || !profile.studentName) {
        try {
            const user = await api.me();
            if (user) {
                cacheUser(user);
                profile = {
                    studentName: user.name,
                    enrollmentNo: user.enrollmentNo,
                    batch: user.batch,
                    courseName: user.course
                };
            }
        } catch (e) {
            // let layout.js handle redirect if unauthenticated
        }
    }

    if (profile && profile.studentName) {
        document.getElementById("studentName").value = profile.studentName || "";
        document.getElementById("enrollmentNo").value = profile.enrollmentNo || "";
        document.getElementById("batch").value = profile.batch || "";
        document.getElementById("courseName").value = profile.courseName || "";
        profileNotice.hidden = true;
        submitButton.disabled = false;
    } else {
        profileNotice.hidden = false;
        profileNotice.innerHTML = 'No student profile found. <a href="signup.html">Register first</a> so your details can be filled in.';
        submitButton.disabled = true;
    }
}

async function handleCreationSubmit(event) {
    event.preventDefault();

    showNotice("");

    const value = (id) => document.getElementById(id).value.trim();
    const deadlineVal = document.getElementById("deadline").value;
    const deadline = new Date(deadlineVal);

    if (!deadlineVal || Number.isNaN(deadline.getTime()) || deadline <= new Date()) {
        showNotice("Please choose a delivery deadline in the future.");
        return;
    }

    const reward = Number(value("reward"));
    if (Number.isNaN(reward) || reward < 10) {
        showNotice("Reward must be at least ₹10.");
        return;
    }

    const agentMobile = value("agentMobile").replace(/\D/g, "");
    if (agentMobile && agentMobile.length !== 10) {
        showNotice("Delivery agent contact number must be exactly 10 digits.");
        return;
    }

    const pickupOtp = value("pickupOtp");
    if (!/^[A-Za-z0-9]{3,10}$/.test(pickupOtp)) {
        showNotice("Pickup OTP must be between 3 and 10 letters or digits.");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Publishing Request…";

    try {
        const isUrgent = Boolean(document.getElementById("isUrgent") && document.getElementById("isUrgent").checked);

        const created = await api.post("/api/requests", {
            pickupLocation: value("fromLocation"),
            dropLocation: value("toLocation"),
            reward: reward,
            deadline: deadline.toISOString(),
            companyName: value("companyName"),
            agentName: value("agentName"),
            agentMobile: agentMobile,
            pickupOtp: pickupOtp,
            itemDescription: value("itemDescription"),
            isUrgent: isUrgent
        });

        submitButton.textContent = "Published! Redirecting…";
        // Smoothly redirect to My Activity where the newly created request is visible
        window.location.href = "my-requests.html";
    } catch (error) {
        showNotice(api.describeError(error));
        submitButton.disabled = false;
        submitButton.textContent = "Publish Request";
    }
}

initStudentProfile();
creationForm.addEventListener("submit", handleCreationSubmit);
