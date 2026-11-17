# CampusCarry Backend

Express + MongoDB Atlas + Mongoose, built to the *CampusCarry Backend Development Standards v1.0*.
This README covers: project status (done / left), setup, frontend integration, team workflow, deployment, and troubleshooting.

---

## 1. Project status

### 1.1 Overall progress

| Area | Status | Notes |
|---|---|---|
| Backend code (all routes, models, middleware) | DONE | Written to the standards doc |
| Authentication | DONE | Server-side sessions, see 1.3 |
| Email verification flow | DONE (code) | Needs real SMTP for production |
| Backend tested against a real MongoDB | NOT DONE | Must be done by the team (section 6) |
| Frontend integration (fetch calls) | NOT DONE | 0% so far. Every page still needs wiring |
| Admin dashboard integration | NOT DONE | Endpoints exist, page not connected |
| Deployment | NOT DONE | Optional, "if time is there" |
| Automated tests | NOT DONE | Manual checklist only (section 6) |

Rough split: **backend about 90% (code complete, untested on live DB), frontend integration 0%, deployment 0%.**

### 1.2 What is done (backend)

**Database (all four collections, as in the doc)**
- [x] `users`, `parcelRequests`, `messages`, `notifications` Mongoose models, with exact field names, types and indexes
- [x] Unique email and enrollment number, email lowercased, 6-digit enrollment, 10-digit mobile
- [x] `passwordHash` never returned to the frontend; tokens hidden too
- [x] Collections are created automatically by Mongoose (no manual Atlas setup)

**Authentication and security**
- [x] Register, login, logout, session check (`/api/auth/*`)
- [x] bcrypt password hashing (12 rounds)
- [x] Session ID in a Secure/HttpOnly cookie, sessions stored in MongoDB
- [x] Session regenerated on login (prevents session fixation)
- [x] Email verification: hashed token, 24h expiry, resend endpoint, login blocked until verified
- [x] University email-domain check (configurable)
- [x] Same generic error for wrong email or wrong password (no account enumeration)
- [x] Rate limiting on login/register/resend and on the API overall
- [x] Helmet security headers, CORS allow-list, origin check on state-changing requests
- [x] Server-side validation of every input
- [x] No secrets in code; `.env` is git-ignored; no hardcoded admin (admin created by script)

**Parcel requests**
- [x] Create, list available, urgent filter, mine, delivering, details
- [x] Requester comes from the session, not the form
- [x] Reward at least Rs 10, deadline must be in the future
- [x] Atomic accept (no double acceptance), cannot accept your own request
- [x] Status flow `accepted -> picked_up -> out_for_delivery -> delivered`, assigned partner only, no skipping
- [x] Cancel pending requests (requester only)
- [x] Auto-expiry of overdue pending requests (every minute and on reads)
- [x] Pickup OTP and agent details hidden from the public list; shown only to the two participants while active

**Messages, notifications, history, admin**
- [x] Chat between requester and partner only, stored in MongoDB, chronological, `?after=` for polling
- [x] Notifications created for: accepted, status updated, new message, expired
- [x] List and mark read (plus mark-all-read)
- [x] Delivery history and total earnings
- [x] Admin stats and admin request list (admin only)

**Project files**
- [x] `.env.example`, `.gitignore`, admin creation script, frontend `api-client.js` helper, this README

### 1.3 About JWT (important)

**JWT is intentionally NOT used.** Your standards doc (section 9) requires "server-validated sessions with secure, HttpOnly cookies" and says pages must not trust localStorage for authentication. JWT usually ends up stored in localStorage, which the doc forbids. So authentication uses server-side sessions instead, and that part is complete.

If someone on the team insists on JWT, it needs a team decision first, because it changes the doc's rule. It is not needed for anything in the project.

### 1.4 What is left

**A. Must do before the project works end to end**
1. **Run the backend on a real Atlas database and run the full test checklist (section 6).** The code has been syntax-checked and smoke-tested for routes that do not need a database, but register, accept, chat, etc. have not been run against live MongoDB. Expect small bugs; fix them through pull requests.
2. **Confirm the university's exact email domain** and set `ALLOWED_EMAIL_DOMAINS` (default `bmu.edu.in` is a guess).
3. **Frontend integration, page by page** (this is the biggest remaining chunk):
   - [ ] Register page -> `POST /auth/register`, plus a "check your email" message
   - [ ] Login / logout -> `POST /auth/login`, `/auth/logout`; check session on load with `GET /auth/me`
   - [ ] Profile page -> `GET` and `PATCH /users/me`
   - [ ] Create request form -> `POST /requests`
   - [ ] Available requests and urgent filter -> `GET /requests`, `?urgent=true`
   - [ ] My requests / tracking page -> `GET /requests/mine`, `GET /requests/:id`
   - [ ] My deliveries page -> `GET /requests/delivering`
   - [ ] Accept, update status, cancel buttons -> the `PATCH` endpoints
   - [ ] Chat page -> `GET` and `POST /requests/:id/messages` (poll every 5 to 10 seconds)
   - [ ] Notifications bell/list -> `GET /notifications`, `PATCH .../read`
   - [ ] History and earnings page -> `/users/me/deliveries`, `/users/me/earnings`
   - [ ] Admin dashboard -> `/admin/stats`, `/admin/requests`
   - [ ] Remove every localStorage source of truth for accounts, requests, messages and tracking
   - [ ] Add loading, success and error states on each page
   - [ ] Map status values to display text (`out_for_delivery` -> "Out for Delivery")
   - [ ] Show the verification result on the login page (`?verified=true` or `false`)
4. **Create the admin account** (`npm run create-admin`).
5. **Set up SMTP** if you want real verification emails (for local development the link prints in the server console).

**B. Needed only if you deploy**
- [ ] Deploy the backend (Render or Railway) with production environment variables
- [ ] Deploy the frontend (Netlify, Vercel or GitHub Pages) and change `API_BASE`
- [ ] Real SMTP is mandatory in production
- [ ] Switch `CLIENT_ORIGINS` / `CLIENT_URL` / `BACKEND_URL` to the live URLs and re-run the full test checklist on the live site

**C. Known limitations and items for the team to decide**
- Cancelling after acceptance is **not** supported (the doc says it needs a separately agreed workflow). It returns `409 CANNOT_CANCEL`.
- `agentName`, `agentMobile`, `itemDescription` are optional on a request; required fields are pickupLocation, dropLocation, reward, deadline, companyName, pickupOtp. Change in `routes/requestRoutes.js` if the team wants otherwise.
- No "forgot password" or change-password feature (not in the doc).
- Notifications and chat use polling, not WebSockets (the doc says WebSockets are not required).
- The `request_cancelled` notification type exists, but nothing sends it yet, because only pending requests can be cancelled (there is no partner to notify).
- Rate limiter counts are kept in server memory; they reset on restart and are per server instance. Fine for a student project.
- No automated test suite and no pagination on most lists (limits of 50 to 200 apply).
- Render's free tier sleeps when idle; the first request after a pause can take 30 to 60 seconds.

---

## 2. Where this goes in the repo

Put the whole `backend` folder at the top level of your existing CampusCarry repo, next to the frontend:

```
CampusCarry/            <- existing repo
├── backend/            <- this folder
├── (your HTML, CSS, JS pages stay where they are)
└── .gitignore
```

If the repo already has a server or admin folder, check it first so you do not overwrite someone's work. Reuse old admin code only if it follows the new data model.

One person (the team lead) does the first push:

```bash
git checkout main && git pull
git checkout -b feature/backend-setup
# copy the backend folder in, then:
git status        # confirm .env and node_modules are NOT listed
git add backend
git commit -m "Add shared backend: models, routes, auth, middleware"
git push -u origin feature/backend-setup
```

Open a pull request and merge it. If `git status` ever shows `.env`, stop and fix that before committing.

## 3. Setup

### 3.1 One-time (team lead)
1. Install Node.js 18 or newer from nodejs.org.
2. In MongoDB Atlas, create a free cluster.
3. Database Access: create a database user and password (avoid special characters, or URL-encode them).
4. Network Access: add `0.0.0.0/0` for development so everyone can connect.
5. Connect -> Drivers: copy the connection string and replace `<password>`.
6. Share the string with teammates privately (never on GitHub).

Everyone uses the same string, so the whole team shares one database named `campuscarry`.

### 3.2 Every team member
```bash
git checkout main && git pull
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

Edit `.env`:
- `MONGODB_URI`: the shared string
- `SESSION_SECRET`: a long random string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
- `CLIENT_ORIGINS`: the exact address your frontend runs on
- `ALLOWED_EMAIL_DOMAINS`: the confirmed university domain
- Leave `SMTP_*` empty for local development

Start it:
```bash
npm run dev      # auto-restarts on changes
npm start        # plain start
```
You should see `[db] Connected to MongoDB database "campuscarry"` and `CampusCarry API listening on port 5000`.
Check `http://localhost:5000/api/health`.

### 3.3 Email verification
Registration creates an unverified account and emails a link (valid 24 hours). Clicking it calls `GET /api/auth/verify-email?token=...`, marks the account verified and redirects to `CLIENT_URL + VERIFY_REDIRECT_PATH` with `?verified=true` or `?verified=false`. Login is blocked until verified.

With no `SMTP_HOST` set, the link is **printed in the server terminal**. For real emails use Gmail (app password), Brevo, Mailtrap, etc. in the `SMTP_*` variables. `POST /api/auth/resend-verification {email}` sends a fresh link. `REQUIRE_EMAIL_VERIFICATION=false` skips verification (local testing only).

### 3.4 Create the admin (no hardcoded credentials)
```bash
ADMIN_EMAIL=you@bmu.edu.in ADMIN_PASSWORD='StrongPass123' npm run create-admin
```
PowerShell: `$env:ADMIN_EMAIL="..."; $env:ADMIN_PASSWORD="..."; npm run create-admin`.
Then log in with it like a normal user.

## 4. Connecting the frontend

1. **Serve the frontend over http** (VS Code Live Server, usually `http://127.0.0.1:5500`). A page opened as `file://` cannot use the login cookie.
2. **Use the same hostname for frontend and backend.** Frontend on `127.0.0.1:5500` means the API is `http://127.0.0.1:5000/api`; frontend on `localhost:5500` means `localhost`. Mixing them loses the cookie. Make these match: `CLIENT_ORIGINS`, `BACKEND_URL` (in `.env`) and `API_BASE` (in `api-client.js`).
3. Copy `docs/api-client.js` into the frontend (for example `js/api.js`) and include it on every page: `<script src="js/api.js"></script>`.
4. Every `fetch` must use `credentials: 'include'` (the helper already does).
5. Responses are always `{ success: true, data }` or `{ success: false, error: { code, message } }`.
6. Map existing HTML ids to API field names, for example:
```js
await api('/requests', { method: 'POST', body: {
  pickupLocation: document.getElementById('fromLocation').value,
  dropLocation:   document.getElementById('toLocation').value,
  reward:         Number(document.getElementById('reward').value),
  deadline:       new Date(document.getElementById('deadline').value).toISOString(),
  companyName:    document.getElementById('companyName').value,
  pickupOtp:      document.getElementById('pickupOtp').value
}});
```
7. Show readable status text, not raw values (`out_for_delivery` -> "Out for Delivery").

### Which page uses which endpoint

| Page / feature | Endpoints |
|---|---|
| Register, login, logout | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me` |
| Profile | `GET`, `PATCH /users/me` |
| Create request | `POST /requests` |
| Available / urgent | `GET /requests`, `GET /requests?urgent=true` |
| My requests, tracking | `GET /requests/mine`, `GET /requests/:id` |
| My deliveries | `GET /requests/delivering` |
| Accept, progress, cancel | `PATCH /requests/:id/accept`, `/status`, `/cancel` |
| Chat | `GET`, `POST /requests/:id/messages` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read` |
| History, earnings | `/users/me/deliveries`, `/users/me/earnings` |
| Admin | `/admin/stats`, `/admin/requests` |

Extra helpers beyond the doc: `GET /auth/verify-email`, `POST /auth/resend-verification`, `PATCH /notifications/read-all`, `GET /health`.

## 5. Behaviour decisions

- **Available Requests** (`GET /requests`): pending, not expired, **excluding your own**. Never includes `pickupOtp`, `agentName`, `agentMobile`.
- **Request details** (`GET /requests/:id`): participants see everything; any logged-in user sees the public view of a *pending* request; admins see everything except the OTP; others get 403.
- **Pickup OTP** is shown only to the requester and assigned partner, and hidden once the request is delivered, cancelled or expired.
- **Accept** is one atomic database update. Loser gets `409 REQUEST_NOT_AVAILABLE`; accepting your own request gets `403`.
- **Status updates**: body `{ "status": "picked_up" }`, assigned partner only, strictly in order.
- **Cancel**: requester only, pending only.
- **Urgent** (`?urgent=true`): pending, before deadline, created 30 or more minutes ago.
- **Messages**: only requester and partner, only while the request is accepted / picked_up / out_for_delivery (history stays readable). `?after=<ISO date>` returns only newer messages.

## 6. Testing (shared checklist from section 13 of the doc)

Use two browsers (for example Chrome and Edge) with two accounts. First try the API from the browser console after pasting the `api` helper:
```js
await api('/auth/register', {method:'POST', body:{
  name:'Test One', enrollmentNo:'123456', email:'test1@bmu.edu.in',
  course:'B.Tech', batch:'2024', hostel:'H1', mobileNo:'9876543210', password:'Password123'}})
```
Copy the verification link from the server terminal, open it, then log in and call `api('/auth/me')`.

Checklist:
- [ ] Student A registers, verifies and logs in
- [ ] A creates a parcel request
- [ ] Student B logs in on another browser and sees A's request
- [ ] B accepts it; A sees it accepted
- [ ] B updates progress; A sees the new tracking status
- [ ] Both exchange messages
- [ ] B completes delivery; history and earnings update
- [ ] Admin dashboard shows correct records
- [ ] A third student cannot accept the already accepted request (409)
- [ ] Outsiders cannot read private requests or messages (403)

## 7. Team workflow
- Each person works on their own feature branch (for example `feature/chat-integration`), pulls `main` first, pushes, and opens a pull request.
- Shared files (`models/`, `utils/serializers.js`, `config/`, `app.js`) change only after the team agrees. Do not rename fields, response formats or statuses on your own.
- Each feature owner maintains their own route file.
- Never commit `.env`, `node_modules`, passwords or keys.

## 8. Deploying (optional)
1. Push everything to GitHub.
2. **Backend on Render/Railway**: Web Service, root directory `backend`, build `npm install`, start `npm start`.
3. Environment variables on the host: `NODE_ENV=production`, `MONGODB_URI`, `SESSION_SECRET`, `CLIENT_ORIGINS=https://<frontend>`, `CLIENT_URL=https://<frontend>`, `BACKEND_URL=https://<api>`, `ALLOWED_EMAIL_DOMAINS`, and all `SMTP_*`.
4. Atlas Network Access must allow the host (`0.0.0.0/0` is acceptable for a student project with a strong DB password).
5. **Frontend on Netlify/Vercel/GitHub Pages**: change `API_BASE` to `https://<api>/api`.
6. Frontend and backend on different domains need `COOKIE_SAMESITE=none` with HTTPS (the production default). Same site: `lax`.
7. Re-run the full checklist on the live site. Warm up the free Render server before demos.

## 9. Troubleshooting

| Problem | Likely cause / fix |
|---|---|
| CORS error in console | Frontend's exact origin missing from `CLIENT_ORIGINS` (check port and `localhost` vs `127.0.0.1`) |
| Login works but next call is 401 | Cookie not kept: missing `credentials: 'include'`, `file://` page, or mixed hostnames |
| `MongooseServerSelectionError` | Atlas blocks your IP, or wrong password in the connection string |
| `Missing required environment variable` | `.env` missing or not inside `backend/` |
| `EADDRINUSE` | Port taken; change `PORT` in `.env` and `API_BASE` |
| Register says email not allowed | Domain does not match `ALLOWED_EMAIL_DOMAINS` |
| No verification link | Without SMTP the link only appears in the server terminal |
| 403 on a request | You are not the requester or assigned partner for it |
| 409 on accept | Someone else accepted first, or it expired / was cancelled |

## 10. Folder layout
```
backend/
  server.js  app.js  package.json  .env.example  .gitignore
  config/        env.js  db.js  constants.js
  models/        User.js  ParcelRequest.js  Message.js  Notification.js
  routes/        authRoutes  userRoutes  requestRoutes  messageRoutes
                 notificationRoutes  adminRoutes  index
  middleware/    authMiddleware.js  errorHandler.js
  utils/         serializers  validators  mailer  notify  expiry  response  AppError  asyncHandler
  scripts/       createAdmin.js
  docs/          api-client.js
```
