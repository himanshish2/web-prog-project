// admin.js - admin dashboard logic (needs the backend at API_BASE)

// WARNING: these credentials are visible to anyone who opens this file or
// views the page source. Fine for a classroom prototype; the real check must
// happen on the server in Phase 3. Keep in sync with backend/server.js.
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";
const BASIC_AUTH = "Basic " + btoa(ADMIN_USER + ":" + ADMIN_PASS);
const API_BASE = "http://localhost:3001";

const adminMessage = document.getElementById("adminMessage");

function showError(text) {
    adminMessage.textContent = text;
    adminMessage.hidden = false;
}

// Generic fetch helper that adds the Authorization header.
async function fetchJson(path) {
    const response = await fetch(API_BASE + path, {
        headers: { "Authorization": BASIC_AUTH }
    });
    if (!response.ok) throw new Error("Failed " + path + ": " + response.status);
    return response.json();
}

// Fill the statistics table.
async function loadStats() {
    try {
        const stats = await fetchJson("/stats");
        const tbody = document.querySelector("#statsTable tbody");
        tbody.innerHTML = "";
        for (const [key, value] of Object.entries(stats)) {
            const row = document.createElement("tr");
            const nameCell = document.createElement("td");
            nameCell.textContent = key.charAt(0).toUpperCase() + key.slice(1);
            const valueCell = document.createElement("td");
            valueCell.textContent = value;
            row.append(nameCell, valueCell);
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error(error);
        showError("Could not load statistics. Is the backend running at " + API_BASE + "?");
    }
}

// Show the raw order data for debugging.
async function loadOrders() {
    try {
        const orders = await fetchJson("/orders");
        document.getElementById("ordersRaw").textContent = JSON.stringify(orders, null, 2);
    } catch (error) {
        console.error(error);
        showError("Could not load orders. Is the backend running at " + API_BASE + "?");
    }
}

// Download the Excel file: fetch it as a Blob, then trigger a download.
async function downloadExcel() {
    try {
        const response = await fetch(API_BASE + "/export", {
            headers: { "Authorization": BASIC_AUTH }
        });
        if (!response.ok) throw new Error("Export failed");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "CampusCarry_Orders.xlsx";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error(error);
        showError("Excel export failed. Is the backend running at " + API_BASE + "?");
    }
}

document.getElementById("downloadBtn").addEventListener("click", downloadExcel);

loadStats();
loadOrders();
