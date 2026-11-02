// login.js - email + password log in / sign up (demo, browser only).
//
// Accounts live in this browser's localStorage. The password is never stored as
// typed: only a salted PBKDF2 hash is kept. This is still NOT real security
// (anyone with access to the browser can read or change localStorage), so the
// real check must move to the backend in Phase 3.

const ACCOUNTS_KEY = "campusCarryAccounts";

const authForm = document.getElementById("authForm");
const tabSignup = document.getElementById("tabSignup");
const tabLogin = document.getElementById("tabLogin");
const emailInput = document.getElementById("authEmail");
const passwordInput = document.getElementById("authPassword");
const confirmInput = document.getElementById("authConfirm");
const messageBox = document.getElementById("authMessage");

// login.html#signup (the navbar "Sign Up" button) opens the Sign Up tab.
if (window.location.hash === "#signup") {
    tabSignup.checked = true;
}

function showMessage(text, isError) {
    messageBox.textContent = text;
    messageBox.classList.toggle("isError", isError);
}

// Clear the message when the visitor switches tab.
tabLogin.addEventListener("change", function () { showMessage("", false); });
tabSignup.addEventListener("change", function () { showMessage("", false); });

// ---------- Saved accounts ----------
function readAccounts() {
    try {
        const list = JSON.parse(localStorage.getItem(ACCOUNTS_KEY));
        return Array.isArray(list) ? list : [];
    } catch (error) {
        return [];
    }
}

function saveAccounts(list) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

// ---------- Password hashing (salted PBKDF2, built into the browser) ----------
function toHex(bytes) {
    return Array.from(bytes).map(function (b) {
        return b.toString(16).padStart(2, "0");
    }).join("");
}

function fromHex(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

function newSalt() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return toHex(bytes);
}

async function hashPassword(password, saltHex) {
    const keyMaterial = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: fromHex(saltHex), iterations: 100000, hash: "SHA-256" },
        keyMaterial, 256
    );
    return toHex(new Uint8Array(bits));
}

// ---------- Helpers ----------
function readProfileFor(email) {
    try {
        const profile = JSON.parse(localStorage.getItem("studentProfile"));
        if (profile && String(profile.bmuEmail).toLowerCase() === email) return profile;
    } catch (error) { /* ignore */ }
    return null;
}

// ---------- Sign up ----------
async function signUp(email, password, confirm) {
    if (password.length < 6) {
        showMessage("Password must be at least 6 characters.", true);
        return;
    }
    if (password !== confirm) {
        showMessage("Passwords do not match.", true);
        return;
    }

    const accounts = readAccounts();
    const exists = accounts.some(function (a) { return a.email === email; });
    if (exists) {
        showMessage("An account with this email already exists. Please log in.", true);
        return;
    }

    const salt = newSalt();
    accounts.push({ email: email, salt: salt, hash: await hashPassword(password, salt) });
    saveAccounts(accounts);

    // Signed in; signup.html collects the student details next.
    CC.setUser({ name: email.split("@")[0], contact: "", email: email });
    window.location.href = "signup.html";
}

// ---------- Log in ----------
async function logIn(email, password) {
    const account = readAccounts().find(function (a) { return a.email === email; });

    if (!account || (await hashPassword(password, account.salt)) !== account.hash) {
        showMessage("Incorrect email or password.", true);
        return;
    }

    const profile = readProfileFor(email);
    CC.setUser({
        name: profile ? profile.studentName : email.split("@")[0],
        contact: profile ? profile.mobileNo : "",
        email: email
    });
    window.location.href = "dashboard.html";
}

// ---------- Form ----------
authForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    if (!window.crypto || !crypto.subtle) {
        showMessage("Open this site with Live Server or localhost so passwords can be protected.", true);
        return;
    }
    if (email === "" || !emailInput.checkValidity()) {
        showMessage("Please enter a valid email address.", true);
        return;
    }
    if (password === "") {
        showMessage("A password is required.", true);
        return;
    }

    showMessage("", false);
    if (tabSignup.checked) {
        await signUp(email, password, confirm);
    } else {
        await logIn(email, password);
    }
});