// CampusCarry login and first stage of registration.
// Login uses the backend session. Signup continues to signup.html.

const authForm = document.getElementById("authForm");
const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const emailInput = document.getElementById("authEmail");
const passwordInput = document.getElementById("authPassword");
const messageBox = document.getElementById("authMessage");
const resendButton = document.getElementById("resendButton");
const submitButton = authForm.querySelector('button[type="submit"]');

const confirmGroup = document.createElement("div");
confirmGroup.className = "inputFieldGroup";
confirmGroup.hidden = true;

const confirmInput = document.createElement("input");
confirmInput.type = "password";
confirmInput.className = "inputUnderline";
confirmInput.id = "authConfirmPassword";
confirmInput.placeholder = "Confirm password";
confirmInput.setAttribute("aria-label", "Confirm password");
confirmInput.autocomplete = "new-password";
confirmGroup.appendChild(confirmInput);

passwordInput.closest(".inputFieldGroup")
    .insertAdjacentElement("afterend", confirmGroup);

function showMessage(message, isError = true) {
    messageBox.textContent = message;
    messageBox.classList.toggle("isError", isError);
}

function updateMode() {
    const signupMode = tabSignup.checked;

    confirmGroup.hidden = !signupMode;

    const forgotRow = document.querySelector(".forgotRow");
    if (forgotRow) forgotRow.hidden = signupMode;

    resendButton.hidden = true;

    passwordInput.autocomplete = signupMode
        ? "new-password"
        : "current-password";

    submitButton.querySelector(".labelLogin").hidden = signupMode;
    submitButton.querySelector(".labelSignup").hidden = !signupMode;

    showMessage("");
}

tabLogin.addEventListener("change", updateMode);
tabSignup.addEventListener("change", updateMode);

// Open signup mode when redirected from the navbar/footer.
const params = new URLSearchParams(window.location.search);

if (params.get("mode") === "signup") {
    tabSignup.checked = true;
}

updateMode();

// Verification messages
if (params.get("verified") === "true") {
    tabLogin.checked = true;
    updateMode();
    showMessage("Email verified! You can log in now.", false);
} else if (params.get("verified") === "false") {
    tabLogin.checked = true;
    updateMode();
    showMessage(
        "That verification link is invalid or has expired. Enter your email and use Resend verification email.",
        true
    );
    resendButton.hidden = false;
} else if (params.get("reason") === "server") {
    tabLogin.checked = true;
    updateMode();
    showMessage("Cannot reach the server. Is the backend running?", true);
}

// Resend verification email
resendButton.addEventListener("click", async function () {
    const email = emailInput.value.trim().toLowerCase();

    if (!email) {
        showMessage("Type your email address first.");
        return;
    }

    resendButton.disabled = true;

    try {
        await api.resendVerification(email);
        showMessage(
            "If this account needs verification, a new link has been sent. Check your inbox.",
            false
        );
    } catch (error) {
        showMessage(api.describeError(error));
    }

    resendButton.disabled = false;
});

// Existing backend login
async function logIn(email, password) {
    const user = await api.login(email, password);
    const confirmed = await api.me();

    if (!confirmed) {
        showMessage(
            "Login succeeded, but the session was not retained. Check your frontend and backend addresses."
        );
        return;
    }

    cacheUser(confirmed || user);
    navigate("dashboard.html");
}

// Form submission
authForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!email || !emailInput.checkValidity()) {
        showMessage("Please enter a valid email address.");
        return;
    }

    if (!password) {
        showMessage("Please enter a password.");
        return;
    }

    // STAGE 1: SIGNUP
    if (tabSignup.checked) {
        const confirmPassword = confirmInput.value;

        if (password.length < 8 || password.length > 72) {
            showMessage("Password must be between 8 and 72 characters.");
            return;
        }

        if (password !== confirmPassword) {
            showMessage("Passwords do not match.");
            return;
        }

        try {
            // Temporarily carry credentials to the registration page.
            // This is cleared after the backend registration request.
            sessionStorage.setItem(
                "cc_pending_registration",
                JSON.stringify({ email, password })
            );

            navigate("signup.html");

        } catch (error) {
            showMessage(
                "Could not continue registration. Please enable session storage and try again."
            );
        }

        return;
    }

    // STAGE 2: LOGIN
    showMessage("");
    resendButton.hidden = true;
    submitButton.disabled = true;

    try {
        await logIn(email, password);

    } catch (error) {
        if (error.code === "INVALID_CREDENTIALS") {
            showMessage("Incorrect email or password.");

        } else if (error.code === "EMAIL_NOT_VERIFIED") {
            showMessage(
                "Please verify your email before logging in. Check your inbox."
            );
            resendButton.hidden = false;

        } else {
            showMessage(api.describeError(error));
        }

    } finally {
        submitButton.disabled = false;
    }
});