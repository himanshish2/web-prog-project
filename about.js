// about.js - interactivity for the About Us page
// (the mobile menu lives in nav.js).

// ------------------------------------------------------------
// 1. HOW IT WORKS: click a step to see its explanation
// ------------------------------------------------------------

// Array of objects: one object per step.
const stepDetails = [
    {
        title: "Request a Pickup",
        text: "A student who can't collect a parcel creates a request. They enter the pickup location, the delivery location, a short parcel description, any instructions, and the reward they are willing to pay."
    },
    {
        title: "A Partner Accepts",
        text: "A Campus Runner (a student who is already heading that way) looks through the available requests, checks the locations and the reward, and accepts one."
    },
    {
        title: "Parcel Collection",
        text: "The runner collects the parcel from the pickup point and marks it as picked up. Once the parcel has been picked up, the request can no longer be cancelled."
    },
    {
        title: "Parcel Delivered",
        text: "The runner hands the parcel over at the agreed campus location and marks the delivery as complete. The runner receives the reward minus the 2.5% platform commission."
    }
];

const stepButtons = document.querySelectorAll(".stepButton");
const stepPanelKicker = document.getElementById("stepPanelKicker");
const stepPanelTitle = document.getElementById("stepPanelTitle");
const stepPanelText = document.getElementById("stepPanelText");

// Show one step: highlight its button and fill the panel.
function showStep(index) {
    for (let i = 0; i < stepButtons.length; i++) {
        if (i === index) {
            stepButtons[i].classList.add("isActive");
            stepButtons[i].setAttribute("aria-pressed", "true");
        } else {
            stepButtons[i].classList.remove("isActive");
            stepButtons[i].setAttribute("aria-pressed", "false");
        }
    }

    stepPanelKicker.textContent = "Step " + (index + 1) + " of " + stepDetails.length;
    stepPanelTitle.textContent = stepDetails[index].title;
    stepPanelText.textContent = stepDetails[index].text;
}

// Each button stores its step number in data-step (0, 1, 2, 3).
for (let i = 0; i < stepButtons.length; i++) {
    stepButtons[i].addEventListener("click", function () {
        showStep(Number(stepButtons[i].dataset.step));
    });
}

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
