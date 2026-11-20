# ⚙️ CampusCarry — Backend Deployment Notes
### (For Viva Explanation)

---

## What We Did & Why

We deployed our **Node.js + Express** backend on **Render** and connected it to a cloud **MongoDB Atlas** database so the application works live on the internet instead of only on `localhost`.
Because the frontend (`vercel.app`) and backend (`onrender.com`) live on different domains, we configured **CORS**, **cross-origin session cookies**, and **reverse-proxy trust** so authentication and API calls work securely across domains.

---

## Tools / Services Used

| Tool | What it does |
|------|-------------|
| **Render (Web Service)** | Hosts and runs our Node.js/Express server in the cloud (`https://campuscarry-backend-4p1n.onrender.com`) |
| **MongoDB Atlas** | Cloud-hosted MongoDB database storing users, delivery requests, and earnings |
| **GitHub (`main` branch)** | Connects our repository to Render for automated builds and deployments |
| **express-session + connect-mongo** | Manages user login sessions and persists them inside MongoDB |
| **Environment Variables (Render)** | Stores secrets (`MONGO_URI`, `SESSION_SECRET`, SMTP keys, URLs) safely outside Git |

---

## Files & Config Involved

| File / Setting | What it does |
|----------------|-------------|
| `backend/server.js` | Configures Express middleware, CORS allowlist (`CLIENT_ORIGINS`), proxy trust, and mounts `/api` routes |
| `backend/config/` | Reads environment variables (`BACKEND_URL`, `CLIENT_URL`, cookie flags) cleanly across environments |
| `backend/routes/authRoutes.js` | Handles `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, and email verification |
| `backend/scripts/createAdmin.js` | CLI script (`npm run create-admin`) to initialize the admin user (`admin@bmu.edu.in`) in MongoDB Atlas |
| `/api/health` endpoint | Lightweight health-check route used to verify server uptime and wake up Render's free instance |

---

## Step-by-Step Flow (Explain This in the Viva)

### STEP 1 — Cloud Database Setup (MongoDB Atlas)
- Created a cloud cluster on **MongoDB Atlas** and generated a database connection string (`MONGO_URI`).
- Configured Network Access (`0.0.0.0/0`) so Render's dynamic cloud IP addresses can connect to the database.

### STEP 2 — Deploying the Server on Render
- Connected our GitHub repository (`main` branch) to a **Render Web Service**.
- Set the root directory to `backend`, build command to `npm install`, and start command to `node server.js` (or `npm start`).
- Render assigned the live HTTPS URL:
  ```
  https://campuscarry-backend-4p1n.onrender.com
  ```

### STEP 3 — Configuring Production Environment Variables
- Added all secrets and deployment URLs directly inside Render's **Environment** tab (never committed `.env` to GitHub):
  ```
  BACKEND_URL=https://campuscarry-backend-4p1n.onrender.com
  CLIENT_ORIGINS=https://web-prog-project-black.vercel.app
  CLIENT_URL=https://web-prog-project-black.vercel.app
  COOKIE_SAMESITE=none
  COOKIE_SECURE=true
  TRUST_PROXY=1
  ```

### STEP 4 — Solving Cross-Origin Authentication (CORS + Cookies)
- **CORS (`CLIENT_ORIGINS`):** Configured the backend to explicitly allow requests from `https://web-prog-project-black.vercel.app` with `credentials: true`.
- **Reverse Proxy (`TRUST_PROXY=1`):** Render terminates HTTPS at its load balancer before forwarding traffic to Node.js. Setting `trust proxy` allows Express to recognize the connection as secure (`HTTPS`).
- **Cross-Site Cookies (`SameSite=None; Secure`):** Standard `Lax` cookies are blocked when frontend and backend are on different domains. Setting `SameSite=None` with `Secure=true` lets browsers attach the session cookie to cross-origin API calls.

### STEP 5 — Admin Seeding & Cold-Start Warmup
- Ran `npm run create-admin` against the live database to create the admin account (`admin@bmu.edu.in`).
- Because Render's free tier spins down after 15 minutes of inactivity, hitting `/api/health` wakes the container before live demos.

---

## The Full Architecture (Simple Diagram)

```
User Browser (Chrome)
      ↓  HTTPS + Credentials (Cookies)
Vercel Frontend (web-prog-project-black.vercel.app)
      ↓  REST API Calls (/api/...)
Render Load Balancer (HTTPS → TRUST_PROXY=1)
      ↓
Node.js / Express Backend (campuscarry-backend-4p1n.onrender.com)
      ↓  Mongoose ODM
MongoDB Atlas Cloud Database
```

---

## Security & Architecture Points (Say These — Sounds Impressive!)

1. **Zero secrets in Git** — All database URIs, session secrets, and SMTP passwords live strictly in Render's encrypted environment variables.
2. **Strict CORS origin allowlist** — Only our exact Vercel frontend domain is permitted to make credentialed API requests.
3. **HTTP-only `SameSite=None; Secure` cookies** — Protects session tokens from JavaScript XSS access while enabling cross-domain auth over HTTPS.
4. **Proxy-aware Express configuration (`TRUST_PROXY=1`)** — Ensures secure cookie flags and rate limiters work accurately behind Render's cloud reverse proxy.
5. **Health-check endpoint (`/api/health`)** — Provides instant operational monitoring and cold-start recovery.

---

## One-Liner Summary (Memorise This!)

> "We hosted our Node.js/Express backend on Render connected to MongoDB Atlas, and configured strict CORS origin allowlisting, proxy trust (`TRUST_PROXY=1`), and `SameSite=None; Secure` HTTP-only session cookies so our Vercel frontend can securely authenticate and share data across domains over HTTPS."

---

*Notes prepared for CampusCarry Web Programming Project — Viva*