
const stepCards = document.querySelectorAll(".stepCard");

stepCards.forEach(function (card) {
    const extraInfo = card.querySelector(".stepExtra");

    function toggleStep() {
        const isExpanded = card.getAttribute("aria-expanded") === "true";

        extraInfo.hidden = isExpanded;
        card.setAttribute("aria-expanded", String(!isExpanded));
    }

    card.addEventListener("click", toggleStep);

    card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleStep();
        }
    });
});
