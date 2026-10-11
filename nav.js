// nav.js - responsive menu used by BOTH the About Us page and the Tracking page.
// On small screens the links are hidden and a "Menu" button opens/closes them.

const navbar = document.querySelector(".navbar");
const navToggle = document.getElementById("navToggle");
const navMenu = document.getElementById("navMenu");
const navToggleText = document.getElementById("navToggleText");
const navToggleIcon = document.getElementById("navToggleIcon");

// Open or close the menu and keep the accessibility attributes in sync.
function setMenuOpen(isOpen) {
    if (isOpen) {
        navbar.classList.add("menuOpen");
    } else {
        navbar.classList.remove("menuOpen");
    }
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggleText.textContent = isOpen ? "Close" : "Menu";
    navToggleIcon.textContent = isOpen ? "\u2715" : "\u2630";
}

// Tell the CSS that JavaScript is running (so it is safe to hide the links).
navbar.classList.add("navReady");
setMenuOpen(false);

// 1. Click the button: toggle the menu.
navToggle.addEventListener("click", function () {
    const isOpen = navbar.classList.contains("menuOpen");
    setMenuOpen(!isOpen);
});

// 2. Click any link inside the menu: close it.
const navLinkList = navMenu.querySelectorAll("a");
for (let i = 0; i < navLinkList.length; i++) {
    navLinkList[i].addEventListener("click", function () {
        setMenuOpen(false);
    });
}

// 3. Escape key: close the menu and return focus to the button.
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && navbar.classList.contains("menuOpen")) {
        setMenuOpen(false);
        navToggle.focus();
    }
});

// 4. If the window grows to desktop size, reset the menu.
window.addEventListener("resize", function () {
    if (window.innerWidth > 960) {
        setMenuOpen(false);
    }
});
