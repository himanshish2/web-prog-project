// signup.js - student registration: the details step after the account is created
// on the login page (email + password live there). Plain JavaScript, localStorage only.

const signupForm = document.getElementById("studentSignupForm");
const emailField = document.getElementById("bmuEmail");

// The account email comes from the signed-in user and cannot be changed here.
let currentUser = null;
try {
    currentUser = JSON.parse(localStorage.getItem("cc_user"));
} catch (error) {
    currentUser = null;
}
if (currentUser && currentUser.email) {
    emailField.value = currentUser.email;
    emailField.readOnly = true;
    emailField.classList.add("readonlyField");
}

// Download an object as a .json file.
function downloadJSONFile(dataObj, filename) {
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
}

function handleSignupSubmit(event) {
    event.preventDefault();

    const studentName = document.getElementById("studentName").value.trim();
    const enrollmentNo = document.getElementById("enrollmentNo").value.trim();
    const courseName = document.getElementById("courseName").value.trim();
    const batch = document.getElementById("batch").value.trim();
    const bmuEmail = emailField.value.trim().toLowerCase();
    const hostel = document.getElementById("hostel").value;
    const mobileNo = document.getElementById("mobileNo").value.trim();

    if (enrollmentNo.length !== 6 || isNaN(enrollmentNo)) {
        alert("Enrollment number must be exactly 6 digits.");
        return;
    }

    if (mobileNo.length !== 10 || isNaN(mobileNo)) {
        alert("Mobile number must be exactly 10 digits.");
        return;
    }

    // No password here: it was set (and stored only as a hash) on the login page.
    const profileData = {
        studentName: studentName,
        enrollmentNo: enrollmentNo,
        courseName: courseName,
        batch: batch,
        bmuEmail: bmuEmail,
        hostel: hostel,
        mobileNo: mobileNo,
        earnings: 0,
        completedDeliveriesCount: 0,
        registeredAt: new Date().toISOString()
    };

    // 1. Save to localStorage
    localStorage.setItem("studentProfile", JSON.stringify(profileData));

    // 2. Update the signed-in user with the real name and number
    localStorage.setItem("cc_user", JSON.stringify({ name: studentName, contact: mobileNo, email: bmuEmail }));

    // 3. Download a JSON file as proof of the saved data
    downloadJSONFile(profileData, "student_profile_" + enrollmentNo + ".json");

    alert("Registration Successful! Default earnings set to \u20B90. Local JSON file downloaded.");
    window.location.href = "profile.html";
}

signupForm.addEventListener("submit", handleSignupSubmit);