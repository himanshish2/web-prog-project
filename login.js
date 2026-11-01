// login.js - demo login + sign-up confirmation popup.
// There is no password check yet; the backend will do that in Phase 3.

const authForm = document.getElementById("authForm");
const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const signupModal = document.getElementById("signupModal");

// ---------- Log in ----------
authForm.addEventListener("submit", function (event) {
    event.preventDefault();

    let profile = null;
    try {
        profile = JSON.parse(localStorage.getItem("studentProfile"));
    } catch (error) {
        profile = null;
    }

    const typedName = authForm.querySelector('input[type="text"]').value.trim();

    // Save the user so the dashboard lets them in (see app.js).
    CC.setUser({
        name: profile ? profile.studentName : typedName,
        contact: profile ? profile.mobileNo : ""
    });
    window.location.href = "dashboard.html";
});

// ---------- Sign Up tab: ask before leaving for the registration page ----------
function openSignupModal() {
    signupModal.classList.add("open");
    document.getElementById("signupYes").focus();
}

function closeSignupModal() {
    signupModal.classList.remove("open");
    tabLogin.focus();
}

tabSignup.addEventListener("change", function () {
    if (tabSignup.checked) {
        tabLogin.checked = true;     // the page itself always stays on "Log In"
        openSignupModal();
    }
});

document.getElementById("signupNo").addEventListener("click", closeSignupModal);

// Click the dark background or press Escape to close.
signupModal.addEventListener("click", function (event) {
    if (event.target === signupModal) closeSignupModal();
});
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && signupModal.classList.contains("open")) closeSignupModal();
});