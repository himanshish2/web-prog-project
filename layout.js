/* layout.js - one navbar + one footer for every page.
   Edit the links here ONCE and every page updates. */

const NAV_LINKS = [
    { href: "home.html",         text: "Home" },
    { href: "h_about.html",        text: "About Us" },
    { href: "how-it-works.html", text: "How It Works" },
    { href: "tracking.html",     text: "Track Parcel" },
    { href: "dashboard.html",    text: "Dashboard" }
];

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
    return `
    <footer class="siteFooter">
        <div class="footerLayout">
            <div class="footerCol footerBrand">
                <h4><b>CampusCarry</b></h4>
                <p>Student-to-student parcel delivery for the BML Munjal University community.</p>
            </div>

            <div class="footerCol">
                <h4>PLATFORM</h4>
                <a href="home.html">Home</a>
                <a href="about.html">About Us</a>
                <a href="how-it-works.html">How It Works</a>
                <a href="tracking.html">Track Parcel</a>
            </div>

            <div class="footerCol">
                <h4>GET STARTED</h4>
                <a href="login.html">Request Delivery</a>
                <a href="login.html">Become a Runner</a>
                <a href="login.html">Sign Up</a>
            </div>
        </div>

        <div class="footerBottom">
            <p>&copy; 2026 CampusCarry. Web Programming Project.</p>
        </div>
    </footer>`;
}

function setupNavToggle() {
    const toggle = document.getElementById("navToggle");
    const menu = document.getElementById("navMenu");
    const icon = document.getElementById("navToggleIcon");
    const text = document.getElementById("navToggleText");
    if (!toggle || !menu) return;

    toggle.addEventListener("click", function () {
        const isOpen = menu.classList.toggle("isOpen");
        toggle.setAttribute("aria-expanded", String(isOpen));
        icon.innerHTML = isOpen ? "&#10005;" : "&#9776;";
        text.textContent = isOpen ? "Close" : "Menu";
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const currentPage = window.location.pathname.split("/").pop() || "home.html";

    const headerSlot = document.getElementById("siteHeader");
    const footerSlot = document.getElementById("siteFooter");

    if (headerSlot) headerSlot.innerHTML = buildNavbar(currentPage);
    if (footerSlot) footerSlot.innerHTML = buildFooter();

    setupNavToggle();
});