# 🌐 CampusCarry — Frontend Deployment Notes
### (For Viva Explanation)

---

## What We Did & Why

We deployed our static frontend (**HTML, CSS, and Vanilla JavaScript**) on **Vercel** so anyone can access CampusCarry through a fast, globally cached HTTPS link (`https://web-prog-project-black.vercel.app`) without running a local server.
We connected every page to our live Render backend through a centralized API helper (`layout.js`) so signup, login, urgent request creation, parcel tracking, profile earnings, and admin controls work end-to-end.

---

## Tools / Services Used

| Tool | What it does |
|------|-------------|
| **Vercel** | Hosts our static HTML/CSS/JS frontend on a global CDN with automatic HTTPS (`https://web-prog-project-black.vercel.app`) |
| **GitHub (`main` branch)** | Triggers automatic zero-downtime Vercel redeployments whenever code is pushed |
| **Centralized `api` Helper (`layout.js`)** | Routes all frontend `fetch()` calls to our live Render `/api` endpoint with session credentials |
| **Browser DevTools (Network & Console)** | Used to verify HTTP status codes, CORS headers, and cross-origin cookie behavior |

---

## Files & Config Involved

| File | What it does |
|------|-------------|
| `layout.js` | Shared script loaded first on every page; defines `API_BASE` and the `api.get/post/patch/delete` wrapper |
| `index.html` / `login.html` / `signup.html` | Public landing and authentication pages connected to `/api/auth/*` |
| `request.html` / `request.js` | Delivery request creation form (including the **Urgent** flag toggle) |
| `requests.html` / `requests.js` | Live **Available Deliveries** board separating **Urgent** and standard requests |
| `track.html` / `track.js` | Real-time parcel status tracker connected to live MongoDB order states |
| `profile.html` / `profile.js` | Displays live **Personal Earning** rewards and **Past Deliveries** (successful & failed) |
| `admin.html` / `admin.js` | Admin dashboard connected to `/api/admin/*` for platform statistics and order export |

---

## Step-by-Step Flow (Explain This in the Viva)

### STEP 1 — Replacing `localhost` with Live Production API URL
- During local development, scripts pointed to `http://localhost:3001`.
- Before deployment, we audited every `.js` and `.html` file and centralized the backend URL inside `layout.js`:
  ```javascript
  const API_BASE = "https://campuscarry-backend-4p1n.onrender.com/api";
  ```
- Ensured `layout.js` is loaded **before** every page-specific script (`signup.js`, `request.js`, `requests.js`, `track.js`, `profile.js`, `admin.js`) so `api` is always initialized first.

### STEP 2 — Enabling Cross-Origin Session Credentials
- Configured the shared `fetch()` wrapper in `layout.js` (and `admin.js`) to always send:
  ```javascript
  credentials: "include"
  ```
- Without `credentials: "include"`, browsers refuse to attach cookies when calling `onrender.com` from `vercel.app`, which would cause authenticated routes (`/api/auth/me`, creating requests, crediting earnings) to fail.

### STEP 3 — GitHub-to-Vercel CI/CD Pipeline
- Connected our GitHub repository (`main` branch) to Vercel.
- Every `git push` to `main` automatically builds and deploys the updated frontend to:
  ```
  https://web-prog-project-black.vercel.app
  ```
- Verified exact case-sensitive file paths across all `<a href>`, `<script src>`, and `<link href>` tags because Vercel runs on a case-sensitive Linux environment.

### STEP 4 — Browser Compatibility & Cache Verification
- Confirmed cross-origin cookie behavior in **Google Chrome** (since Safari's Intelligent Tracking Prevention blocks third-party cookies between `vercel.app` and `onrender.com`).
- Used hard refreshes (`Cmd + Shift + R`) after deployments to bypass browser caching of updated `.js` files.

---

## The Full Request Journey (Simple Diagram)

```
User interacts with Page (e.g., Create Urgent Request / Complete Delivery)
      ↓
Page Script (request.js / requests.js / profile.js)
      ↓  Calls shared api helper
layout.js (API_BASE + credentials: "include")
      ↓  HTTPS Fetch + Session Cookie
Render Backend (/api/...) → Updates MongoDB Atlas
      ↓  JSON Response
Frontend Dynamically Re-renders UI (Urgent List / Personal Earning / Past Deliveries)
```

---

## Engineering & Deployment Points (Say These — Sounds Impressive!)

1. **Single-source API abstraction (`layout.js`)** — Centralizing `API_BASE`, error handling (`ApiError`), and `credentials: "include"` prevented duplicated `fetch` boilerplate across 7+ pages.
2. **Automated CI/CD via GitHub + Vercel** — Every commit pushed to `main` triggers an atomic deployment with instant HTTPS and CDN caching.
3. **Linux case-sensitivity compliance** — Audited all HTML/JS asset references so builds never break between macOS/Windows development machines and Vercel's Linux servers.
4. **Full-stack data consistency** — Frontend UI sections (**Urgent** deliveries, **Personal Earning**, **Past Deliveries**) reflect live MongoDB state rather than static placeholders.

---

## One-Liner Summary (Memorise This!)

> "We deployed our frontend on Vercel with GitHub CI/CD and routed every page through a centralized `layout.js` API client using `credentials: 'include'`, ensuring seamless, authenticated communication between our Vercel CDN frontend and Render backend."

---

*Notes prepared for CampusCarry Web Programming Project — Viva*