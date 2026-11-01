/* layout.js - one navbar + one footer for every page.
   Edit the links here ONCE and every page updates.
   Every page needs:  <header id="siteHeader"></header>  and  <div id="siteFooter"></div>
   and this script loaded at the END of <body>. */

const NAV_LINKS = [
    { href: "home.html",         text: "Home" },
    { href: "h_about.html",        text: "About Us" },
    { href: "how-it-works.html", text: "How It Works" },
    { href: "request.html",      text: "Requests" },
    { href: "tracking.html",     text: "Track Parcel" },
    { href: "dashboard.html",    text: "Dashboard" }
];

// The "create a request" page is still being built, so "Request Delivery"
// does not link anywhere yet. When the page exists, change "#" to its filename
// (for example "create-request.html") and the footer updates on every page.
const CREATE_REQUEST_HREF = "#";

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

        <a href="login.html" class="btnNav">Sign Up</a>
    </nav>`;
}

function buildFooter() {
    let platformHtml = "";
    for (const link of NAV_LINKS) {
        platformHtml += `<a href="${link.href}">${link.text}</a>`;
    }

    // While CREATE_REQUEST_HREF is "#", mark the link as not available yet.
    const comingSoon = (CREATE_REQUEST_HREF === "#") ? ' aria-disabled="true" title="Coming soon"' : "";

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
                <a href="request.html">Become a Runner</a>
                <a href="login.html">Sign Up</a>
            </div>
        </div>

        <div class="footerBottom">
            <p>&copy; 2026 CampusCarry. Web Programming Project.</p>
        </div>
    </footer>`;
}

// Mobile menu: below 960px the links hide behind a "Menu" button.
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

document.addEventListener("DOMContentLoaded", function () {
    const currentPage = window.location.pathname.split("/").pop() || "home.html";

    const headerSlot = document.getElementById("siteHeader");
    const footerSlot = document.getElementById("siteFooter");

    if (headerSlot) headerSlot.innerHTML = buildNavbar(currentPage);
    if (footerSlot) footerSlot.innerHTML = buildFooter();

    setupNavToggle();

    // Links marked aria-disabled="true" point to pages that are not built yet.
    document.addEventListener("click", function (event) {
        const link = event.target.closest('a[aria-disabled="true"]');
        if (link) event.preventDefault();
    });
});