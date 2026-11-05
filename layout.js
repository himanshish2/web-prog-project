/* layout.js - one navbar + one footer for every page.
   Edit the links here ONCE and every page updates.
   Every page needs:  <header id="siteHeader"></header>  and  <div id="siteFooter"></div>
   and this script loaded at the END of <body>.

   Pages that need a signed-in user put  data-auth="required"  on <body>:
   visitors who are not signed in are sent to login.html. */

const NAV_LINKS = [
    { href: "home.html",         text: "Home" },
    { href: "h_about.html",        text: "About Us" },
    { href: "how-it-works.html", text: "How It Works" },
    { href: "request.html",      text: "Requests" },
    { href: "tracking.html",     text: "Track Parcel" }
];

// Where "Request Delivery" points. Use "#" to switch the link off while a page
// is being built; the footer then shows it as "Coming soon".
const CREATE_REQUEST_HREF = "create-request.html";

// ---------- Signed-in user ----------
// The signed-in pages save the user under "cc_user" (see app.js / login.js / signup.js).
function getSignedInUser() {
    try {
        return JSON.parse(localStorage.getItem("cc_user"));
    } catch (error) {
        return null;
    }
}

function isLoggedIn() {
    return getSignedInUser() !== null;
}

function escapeHtml(text) {
    return String(text === undefined || text === null ? "" : text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Guard: runs straight away, before the page is drawn.
if (document.body && document.body.dataset.auth === "required" && !isLoggedIn()) {
    window.location.replace("login.html");
}

// ---------- Navbar ----------
function buildAccountArea() {
    const user = getSignedInUser();

    // Signed out: the Sign Up button (opens the Sign Up tab on the login page).
    if (user === null) {
        return '<a href="login.html#signup" class="btnNav">Sign Up</a>';
    }

    // Signed in: a profile icon with a small account menu.
    const who = user.name || user.email || "Student";
    return `
        <div class="navProfile">
            <button type="button" class="navProfileBtn" id="navProfileBtn"
                    aria-expanded="false" aria-haspopup="true" aria-controls="navProfileMenu"
                    aria-label="Account menu" title="${escapeHtml(who)}">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>
                </svg>
            </button>
            <ul class="navProfileMenu" id="navProfileMenu" hidden>
                <li class="navProfileName">Signed in as<br><strong>${escapeHtml(who)}</strong></li>
                <li><a href="dashboard.html">Dashboard</a></li>
                <li><a href="profile.html">My Profile</a></li>
                <li><button type="button" id="navLogout">Log out</button></li>
            </ul>
        </div>`;
}

function buildNavbar(currentPage) {
    let linksHtml = "";
    for (const link of NAV_LINKS) {
        const isActive = (link.href === currentPage);
        linksHtml += `<li><a href="${link.href}"${isActive ? ' class="activeLink" aria-current="page"' : ""}>${link.text}</a></li>`;
    }

    return `
    <nav class="navbar" aria-label="Main navigation">
        <div class="logo">
            <a href="home.html"><b>CampusCarry</b></a>
        </div>

        <button type="button" class="navToggle" id="navToggle"
                aria-expanded="false" aria-controls="navMenu">
            <span id="navToggleIcon" aria-hidden="true">&#9776;</span>
            <span id="navToggleText">Menu</span>
        </button>

        <ul class="navLinks" id="navMenu">
            ${linksHtml}
        </ul>

        ${buildAccountArea()}
    </nav>`;
}

// ---------- Footer ----------
function buildFooter() {
    let platformHtml = "";
    for (const link of NAV_LINKS) {
        platformHtml += `<a href="${link.href}">${link.text}</a>`;
    }

    // While CREATE_REQUEST_HREF is "#", mark the link as not available yet.
    const comingSoon = (CREATE_REQUEST_HREF === "#") ? ' aria-disabled="true" title="Coming soon"' : "";

    const accountLinks = isLoggedIn()
        ? '<a href="dashboard.html">Dashboard</a><a href="profile.html">My Profile</a>'
        : '<a href="login.html">Log In</a><a href="login.html#signup">Sign Up</a>';

    return `
    <footer class="siteFooter">
        <div class="footerLayout">
            <div class="footerCol footerBrand">
                <h4><b>CampusCarry</b></h4>
                <p>Student-to-student parcel delivery for the BML Munjal University community.</p>
            </div>

            <div class="footerCol">
                <h4>PLATFORM</h4>
                ${platformHtml}
            </div>

            <div class="footerCol">
                <h4>GET STARTED</h4>
                <a href="${CREATE_REQUEST_HREF}"${comingSoon}>Request Delivery</a>
                ${accountLinks}
            </div>
        </div>

        <div class="footerBottom">
            <p>&copy; 2026 CampusCarry. Web Programming Project.</p>
        </div>
    </footer>`;
}

// ---------- Mobile menu ----------
// Below 960px the links hide behind a "Menu" button.
// The class names (navReady, menuOpen) are the ones h_style.css expects.
function setupNavToggle() {
    const navbar = document.querySelector(".navbar");
    const toggle = document.getElementById("navToggle");
    const menu = document.getElementById("navMenu");
    const icon = document.getElementById("navToggleIcon");
    const text = document.getElementById("navToggleText");
    if (!navbar || !toggle || !menu) return;

    function setMenuOpen(isOpen) {
        navbar.classList.toggle("menuOpen", isOpen);
        toggle.setAttribute("aria-expanded", String(isOpen));
        text.textContent = isOpen ? "Close" : "Menu";
        icon.textContent = isOpen ? "\u2715" : "\u2630";
    }

    // Tells the CSS that JavaScript is running, so it is safe to hide the links.
    navbar.classList.add("navReady");
    setMenuOpen(false);

    // 1. Click the button: toggle the menu.
    toggle.addEventListener("click", function () {
        setMenuOpen(!navbar.classList.contains("menuOpen"));
    });

    // 2. Click any link inside the menu: close it.
    menu.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () { setMenuOpen(false); });
    });

    // 3. Escape key: close the menu and return focus to the button.
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && navbar.classList.contains("menuOpen")) {
            setMenuOpen(false);
            toggle.focus();
        }
    });

    // 4. If the window grows to desktop size, reset the menu.
    window.addEventListener("resize", function () {
        if (window.innerWidth > 960) setMenuOpen(false);
    });
}

// ---------- Profile icon menu ----------
function setupProfileMenu() {
    const button = document.getElementById("navProfileBtn");
    const menu = document.getElementById("navProfileMenu");
    if (!button || !menu) return;

    function setOpen(isOpen) {
        menu.hidden = !isOpen;
        button.setAttribute("aria-expanded", String(isOpen));
    }

    button.addEventListener("click", function () {
        setOpen(menu.hidden);
    });

    // Click anywhere else, or press Escape, to close.
    document.addEventListener("click", function (event) {
        if (!menu.hidden && !menu.contains(event.target) && !button.contains(event.target)) {
            setOpen(false);
        }
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !menu.hidden) {
            setOpen(false);
            button.focus();
        }
    });

    // Log out: forget the user and go back to the login page.
    document.getElementById("navLogout").addEventListener("click", function () {
        try { localStorage.removeItem("cc_user"); } catch (error) { /* ignore */ }
        window.location.href = "login.html";
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const currentPage = window.location.pathname.split("/").pop() || "home.html";

    const headerSlot = document.getElementById("siteHeader");
    const footerSlot = document.getElementById("siteFooter");

    if (headerSlot) headerSlot.innerHTML = buildNavbar(currentPage);
    if (footerSlot) footerSlot.innerHTML = buildFooter();

    setupNavToggle();
    setupProfileMenu();

    // Links marked aria-disabled="true" point to pages that are not built yet.
    document.addEventListener("click", function (event) {
        const link = event.target.closest('a[aria-disabled="true"]');
        if (link) event.preventDefault();
    });
});