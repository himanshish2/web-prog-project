// CampusCarry student registration - second stage.

const signupForm = document.getElementById("studentSignupForm");
const emailField = document.getElementById("bmuEmail");
const signupMessage = document.getElementById("signupMessage");
const signupButton = document.getElementById("signupButton");

const signupDone = document.getElementById("signupDone");
const signupDoneText = document.getElementById("signupDoneText");
const resendButton = document.getElementById("resendButton");
const resendMessage = document.getElementById("resendMessage");

const PENDING_KEY = "cc_pending_registration";

// Retrieve credentials from the first signup stage.
let pendingRegistration = null;

try {
    pendingRegistration = JSON.parse(
        sessionStorage.getItem(PENDING_KEY)
    );
} catch (error) {
    pendingRegistration = null;
}

// If someone opens signup.html directly, return them to stage one.
if (
    !pendingRegistration ||
    !pendingRegistration.email ||
    !pendingRegistration.password
) {
    navigate("login.html?mode=signup", true);
}

// Display the email from stage one.
if (pendingRegistration) {
    emailField.value = pendingRegistration.email;
    emailField.readOnly = true;
    emailField.classList.add("readonlyField");
}

// Remove any password fields left over from the previous signup.html.
const oldPasswordField = document.getElementById("signupPassword");
if (oldPasswordField) {
    oldPasswordField.closest(".formRow")?.remove();
}

function showSignupMessage(message, isError = true) {
    signupMessage.textContent = message;
    signupMessage.hidden = !message;
    signupMessage.classList.toggle("isError", isError);
}

function showResendMessage(message, isError = false) {
    resendMessage.textContent = message;
    resendMessage.hidden = !message;
    resendMessage.classList.toggle("isError", isError);
}

function showRegistrationComplete(result) {
    signupForm.hidden = true;
    signupDone.hidden = false;

    if (result.verificationRequired) {
        signupDone.querySelector(".doneTitle").textContent =
            "Check your email";

        signupDoneText.textContent =
            result.verificationEmailSent === false
                ? "Your account was created, but the verification email could not be sent. Please try resending it."
                : "Your account was created. Verify your BMU email using the link sent to your inbox.";

        resendButton.hidden = false;

    } else {
        signupDone.querySelector(".doneTitle").textContent =
            "Account created";

        signupDoneText.textContent =
            "Your account was created successfully. You can now log in.";

        resendButton.hidden = true;
    }
}

// Submit complete registration to backend.
signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    showSignupMessage("");

    if (!pendingRegistration) {
        showSignupMessage("Registration details are missing. Please start again.");
        return;
    }

    const name =
        document.getElementById("studentName").value.trim();

    const enrollmentNo =
        document.getElementById("enrollmentNo").value.trim();

    const course =
        document.getElementById("courseName").value.trim();

    const batch =
        document.getElementById("batch").value.trim();

    const email =
        emailField.value.trim().toLowerCase();

    const hostel =
        document.getElementById("hostel").value;

    const mobileNo =
        document.getElementById("mobileNo").value.trim();

    if (!signupForm.checkValidity()) {
        signupForm.reportValidity();
        return;
    }

    if (!/^\d{6}$/.test(enrollmentNo)) {
        showSignupMessage("Enrollment number must contain exactly 6 digits.");
        return;
    }

    if (!/^\d{10}$/.test(mobileNo)) {
        showSignupMessage("Mobile number must contain exactly 10 digits.");
        return;
    }

    // All fields expected by backend/routes/authRoutes.js
    const registrationData = {
        name: name,
        enrollmentNo: enrollmentNo,
        email: email,
        course: course,
        batch: batch,
        hostel: hostel,
        mobileNo: mobileNo,
        password: pendingRegistration.password
    };

    signupButton.disabled = true;
    signupButton.textContent = "Creating account...";

    try {
        const result = await api.register(registrationData);

        // Registration request succeeded: remove temporary credentials.
        sessionStorage.removeItem(PENDING_KEY);
        pendingRegistration = null;

        showRegistrationComplete(result || {});

    } catch (error) {
        if (
            ["EMAIL_ALREADY_EXISTS", "DUPLICATE_EMAIL", "EMAIL_EXISTS"].includes(error.code)
        ) {
            showSignupMessage(
                "This email is already registered. Please go to Log In."
            );

        } else if (
            ["ENROLLMENT_ALREADY_EXISTS", "DUPLICATE_ENROLLMENT", "ENROLLMENT_EXISTS"].includes(error.code)
        ) {
            showSignupMessage(
                "This enrollment number is already registered. Please check it."
            );

        } else {
            showSignupMessage(api.describeError(error));
        }

    } finally {
        signupButton.disabled = false;
        signupButton.textContent = "Create Account";
    }
});

// Resend verification email.
resendButton.addEventListener("click", async function () {
    const email = emailField.value.trim().toLowerCase();

    resendButton.disabled = true;
    showResendMessage("");

    try {
        await api.resendVerification(email);

        showResendMessage(
            "If your account needs verification, a new email has been sent. Check your inbox."
        );

    } catch (error) {
        showResendMessage(api.describeError(error), true);

    } finally {
        resendButton.disabled = false;
    }
});