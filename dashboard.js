// dashboard.js - dashboard page logic (uses the CC data layer from app.js)

// Not logged in: requireLogin() sends the visitor to login.html and we stop here.
const user = CC.requireLogin() ? CC.getUser() : null;

if (user) {
    document.getElementById("greetName").textContent = user.name;

    // Count the stats from localStorage.
    const allRequests = CC.getRequests();
    document.getElementById("statOpen").textContent = allRequests.filter(function (r) {
        return r.status === "open";
    }).length;
    document.getElementById("statMine").textContent = allRequests.filter(function (r) {
        return r.requester === user.name;
    }).length;
    document.getElementById("statRunning").textContent = allRequests.filter(function (r) {
        return r.runner === user.name && r.status !== "completed";
    }).length;
    document.getElementById("statDone").textContent = allRequests.filter(function (r) {
        return r.status === "completed";
    }).length;
}

document.getElementById("logoutButton").addEventListener("click", function () {
    CC.logout();
});
