async function refreshDashboard() {
    try {
        const user = await api.me();

        if (!user) {
            window.location.replace("login.html");
            return;
        }

        const stats = await api.get("/api/requests/stats");

        document.getElementById("greetName").textContent = user.name;
        document.getElementById("statOpen").textContent = stats.open;
        document.getElementById("statMine").textContent = stats.total;
        document.getElementById("statRunning").textContent = stats.delivering;
        document.getElementById("statDone").textContent = stats.completed;
    } catch (error) {
        console.error("Could not load dashboard counts:", error);
    }
}

refreshDashboard();
setInterval(refreshDashboard, 8000);