// about.js - interactivity for the About Us page
// (the mobile menu lives in nav.js).

// ------------------------------------------------------------
// 2. FAQ: click a question to open or close its answer
// ------------------------------------------------------------

const faqButtons = document.querySelectorAll(".faqQuestion");

function toggleFaq(button) {
    // aria-controls holds the id of the answer this button controls.
    const answer = document.getElementById(button.getAttribute("aria-controls"));
    const icon = button.querySelector(".faqIcon");
    const isOpen = button.getAttribute("aria-expanded") === "true";

    if (isOpen) {
        button.setAttribute("aria-expanded", "false");
        answer.hidden = true;
        icon.textContent = "+";
    } else {
        button.setAttribute("aria-expanded", "true");
        answer.hidden = false;
        icon.textContent = "\u2212";
    }
}

for (let i = 0; i < faqButtons.length; i++) {
    faqButtons[i].addEventListener("click", function () {
        toggleFaq(faqButtons[i]);
    });
}
