// signup.js - student registration (saves to localStorage, plain JavaScript)

const signupForm = document.getElementById("studentSignupForm");

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
    const bmuEmail = document.getElementById("bmuEmail").value.trim();
    const hostel = document.getElementById("hostel").value;
    const mobileNo = document.getElementById("mobileNo").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirmPassword").value;

    if (password !== confirmPassword) {
        alert("Passwords do not match! Please check and try again.");
        return;
    }

    if (enrollmentNo.length !== 6 || isNaN(enrollmentNo)) {
        alert("Enrollment number must be exactly 6 digits.");
        return;
    }

    if (mobileNo.length !== 10 || isNaN(mobileNo)) {
        alert("Mobile number must be exactly 10 digits.");
        return;
    }

    // The password is checked above but NOT stored: this object is saved in the
    // browser and downloaded as a file, and a password must never be kept in plain
    // text. The backend will handle passwords in Phase 3.
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

    // 2. Download a JSON file as proof of the saved data
    downloadJSONFile(profileData, "student_profile_" + enrollmentNo + ".json");

    alert("Registration Successful! Default earnings set to \u20B90. Local JSON file downloaded.");
    window.location.href = "profile.html";
}

signupForm.addEventListener("submit", handleSignupSubmit);
