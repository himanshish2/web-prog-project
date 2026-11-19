
/* layout.js - shared across all CampusCarry pages */

// ============================================================
// 1. API HELPER
// ============================================================

const API_BASE = "https://campuscarry-backend-4p1n.onrender.com/api";

class ApiError extends Error {
    constructor(status, code, message, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details || [];
    }
}

const api = {
    async request(method, path, body) {
        let response;
        const normalizedPath = (API_BASE.endsWith("/api") && path.startsWith("/api"))
            ? path.slice(4)
            : path;

        try {
            response = await fetch(API_BASE + normalizedPath, {
                method: method,
                credentials: "include",
                headers: body === undefined
                    ? {}
                    : { "Content-Type": "application/json" },
                body: body === undefined
                    ? undefined
                    : JSON.stringify(body)
            });
        } catch (error) {
            throw new ApiError(
                0,
                "NETWORK_ERROR",
                "Cannot reach the server. Is the backend running?"
            );
        }

        let json = null;

        try {
            json = await response.json();
        } catch (error) {
            json = null;
        }

        if (!response.ok) {
            const e =
                (json && typeof json.error === "object" && json.error) ||
                json ||
                {};

            const text =
                json && typeof json.error === "string"
                    ? json.error
                    : "";

            throw new ApiError(
                response.status,
                e.code || (json && json.code) || "ERROR",
                e.message ||
                    (json && json.message) ||
                    text ||
                    "Request failed (" + response.status + ").",
                e.details ||
                    e.errors ||
                    (json && (json.details || json.errors)) ||
                    []
            );
        }

        return json && json.data !== undefined
            ? json.data
            : json;
    },

    get(path) {
        return api.request("GET", path);
    },

    post(path, body) {
        return api.request(
            "POST",
            path,
            body === undefined ? {} : body
        );
    },

    async me() {
        try {
            const data = await api.get("/api/auth/me");
            return data.user;
        } catch (error) {
            if (error.status === 401) return null;
            throw error;
        }
    },

    async login(email, password) {
        const data = await api.post("/api/auth/login", {
            email: email,
            password: password
        });

        return data.user;
    },

    register(fields) {
        return api.post("/api/auth/register", fields);
    },

    resendVerification(email) {
        return api.post("/api/auth/resend-verification", {
            email: email
        });
    },

    logout() {
        return api.post("/api/auth/logout");
    },

    describeError(error) {
        if (
            error.code === "VALIDATION_ERROR" &&
            Array.isArray(error.details) &&
            error.details.length
        ) {
            return error.details
                .map(function (d) {
                    return d.message || d;
                })
                .join(". ") + ".";
        }

        return error.message;
    }
};


// ============================================================
// 2. SESSION MANAGEMENT
// ============================================================

const USER_CACHE_KEY = "cc_user";
const PROFILE_CACHE_KEY = "studentProfile";

function getCachedUser() {
    try {
        return JSON.parse(localStorage.getItem(USER_CACHE_KEY));
    } catch (error) {
        return null;
    }
}

function cacheUser(user) {
    try {
        localStorage.setItem(
            USER_CACHE_KEY,
            JSON.stringify({
                name: user.name,
                contact: user.mobileNo || "",
                email: user.email
            })
        );

        localStorage.setItem(
            PROFILE_CACHE_KEY,
            JSON.stringify({
                studentName: user.name,
                enrollmentNo: user.enrollmentNo,
                courseName: user.course,
                batch: user.batch,
                bmuEmail: user.email,
                hostel: user.hostel,
                mobileNo: user.mobileNo
            })
        );
    } catch (error) {
        // Storage unavailable.
    }
}

function clearUserCache() {
    try {
        localStorage.removeItem(USER_CACHE_KEY);
        localStorage.removeItem(PROFILE_CACHE_KEY);
    } catch (error) {
        // Ignore storage errors.
    }
}

// Remove old browser-only authentication data.
try {
    localStorage.removeItem("campusCarryAccounts");
    localStorage.removeItem("cc_token");
} catch (error) {
    // Ignore storage errors.
}

function navigate(url, replace) {
    if (replace) {
        window.location.replace(url);
    } else {
        window.location.href = url;
    }
}

function escapeHtml(text) {
    return String(text === undefined || text === null ? "" : text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Protected pages remain hidden until the server verifies the session.
const pageNeedsLogin =
    Boolean(document.body &&
    document.body.dataset.auth === "required");

if (pageNeedsLogin) {
    document.body.style.visibility = "hidden";
}

async function verifySession() {
    const before = localStorage.getItem(USER_CACHE_KEY);

    let user;

    try {
        user = await api.me();
    } catch (error) {
        if (pageNeedsLogin) {
            navigate("login.html?reason=server", true);
        }
        return;
    }

    if (user) {
        cacheUser(user);
    } else {
        clearUserCache();
    }

    if (pageNeedsLogin && !user) {
        navigate("login.html", true);
        return;
    }

    if (pageNeedsLogin) {
        document.body.style.visibility = "";
    }

    if (localStorage.getItem(USER_CACHE_KEY) !== before) {
        renderChrome();
    }
}


// ============================================================
// 3. NAVBAR AND FOOTER
// ============================================================

const NAV_LINKS = [
    { href: "home.html", text: "Home" },
    { href: "about.html", text: "About Us" },
    { href: "how-it-works.html", text: "How It Works" },
    { href: "request.html", text: "Requests" },
    { href: "tracking.html", text: "Track Parcel" }
];

const CREATE_REQUEST_HREF = "create-request.html";

function buildAccountArea() {
    const user = getCachedUser();

    // Signed out: open the first signup stage.
    if (user === null) {
        return '<a href="login.html?mode=signup" class="btnNav">Sign Up</a>';
    }

    const who = user.name || user.email || "Student";

    return `
        <div class="navProfile">
            <button type="button" class="navProfileBtn"
                    id="navProfileBtn"
                    aria-expanded="false"
                    aria-haspopup="true"
                    aria-controls="navProfileMenu"
                    aria-label="Account menu"
                    title="${escapeHtml(who)}">

                <svg width="22" height="22"
                     viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor"
                     stroke-width="2"
                     stroke-linecap="round"
                     stroke-linejoin="round"
                     aria-hidden="true">

                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>
                </svg>
            </button>

            <ul class="navProfileMenu" id="navProfileMenu" hidden>
                <li class="navProfileName">
                    Signed in as<br>
                    <strong>${escapeHtml(who)}</strong>
                </li>

                <li><a href="dashboard.html">Dashboard</a></li>
                <li><a href="profile.html">My Profile</a></li>

                <li>
                    <button type="button" id="navLogout">
                        Log out
                    </button>
                </li>
            </ul>
        </div>`;
}

function buildNavbar(currentPage) {
    let linksHtml = "";

    for (const link of NAV_LINKS) {
        const isActive = link.href === currentPage;

        linksHtml += `
            <li>
                <a href="${link.href}"
                   ${isActive
                    ? 'class="activeLink" aria-current="page"'
                    : ""}>
                    ${link.text}
                </a>
            </li>`;
    }

    return `
        <nav class="navbar" aria-label="Main navigation">

            <div class="logo">
                <a href="home.html"><b>CampusCarry</b></a>
            </div>

            <button type="button"
                    class="navToggle"
                    id="navToggle"
                    aria-expanded="false"
                    aria-controls="navMenu">

                <span id="navToggleIcon" aria-hidden="true">&#9776;</span>
                <span id="navToggleText">Menu</span>
            </button>

            <ul class="navLinks" id="navMenu">
                ${linksHtml}
            </ul>

            ${buildAccountArea()}

        </nav>`;
}

function buildFooter() {
    let platformHtml = "";

    for (const link of NAV_LINKS) {
        platformHtml += `
            <a href="${link.href}">${link.text}</a>`;
    }

    const comingSoon =
        CREATE_REQUEST_HREF === "#"
            ? ' aria-disabled="true" title="Coming soon"'
            : "";

    const accountLinks = getCachedUser() !== null
        ? `
            <a href="dashboard.html">Dashboard</a>
            <a href="profile.html">My Profile</a>
          `
        : `
            <a href="login.html">Log In</a>
            <a href="login.html?mode=signup">Sign Up</a>
          `;

    return `
        <footer class="siteFooter">

            <div class="footerLayout">

                <div class="footerCol footerBrand">
                    <h4><b>CampusCarry</b></h4>
                    <p>
                        Student-to-student parcel delivery
                        for the BML Munjal University community.
                    </p>
                </div>

                <div class="footerCol">
                    <h4>PLATFORM</h4>
                    ${platformHtml}
                </div>

                <div class="footerCol">
                    <h4>GET STARTED</h4>

                    <a href="${CREATE_REQUEST_HREF}"${comingSoon}>
                        Request Delivery
                    </a>

                    ${accountLinks}
                </div>

            </div>

            <div class="footerBottom">
                <p>
                    &copy; 2026 CampusCarry. Web Programming Project.
                </p>
            </div>

        </footer>`;
}


// ============================================================
// 4. MOBILE NAVIGATION
// ============================================================

function setMenuOpen(isOpen) {
    const navbar = document.querySelector(".navbar");
    const toggle = document.getElementById("navToggle");
    const icon = document.getElementById("navToggleIcon");
    const text = document.getElementById("navToggleText");

    if (!navbar || !toggle) return;

    navbar.classList.toggle("menuOpen", isOpen);

    toggle.setAttribute("aria-expanded", String(isOpen));

    text.textContent = isOpen ? "Close" : "Menu";
    icon.textContent = isOpen ? "\u2715" : "\u2630";
}

function setupNavToggle() {
    const navbar = document.querySelector(".navbar");
    const toggle = document.getElementById("navToggle");
    const menu = document.getElementById("navMenu");

    if (!navbar || !toggle || !menu) return;

    navbar.classList.add("navReady");

    setMenuOpen(false);

    toggle.addEventListener("click", function () {
        setMenuOpen(!navbar.classList.contains("menuOpen"));
    });

    menu.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
            setMenuOpen(false);
        });
    });
}


// ============================================================
// 5. PROFILE MENU AND LOGOUT
// ============================================================

function setProfileMenuOpen(isOpen) {
    const button = document.getElementById("navProfileBtn");
    const menu = document.getElementById("navProfileMenu");

    if (!button || !menu) return;

    menu.hidden = !isOpen;
    button.setAttribute("aria-expanded", String(isOpen));
}

function setupProfileMenu() {
    const button = document.getElementById("navProfileBtn");
    const menu = document.getElementById("navProfileMenu");

    if (!button || !menu) return;

    button.addEventListener("click", function () {
        setProfileMenuOpen(menu.hidden);
    });

    const logoutButton = document.getElementById("navLogout");

    logoutButton.addEventListener("click", async function () {
        try {
            await api.logout();
        } catch (error) {
            alert("Could not log out: " + error.message);
            return;
        }

        clearUserCache();
        navigate("login.html");
    });
}


// ============================================================
// 6. DOCUMENT LISTENERS
// ============================================================

function setupDocumentListeners() {
    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;

        const navbar = document.querySelector(".navbar");

        if (navbar && navbar.classList.contains("menuOpen")) {
            setMenuOpen(false);
            document.getElementById("navToggle").focus();
        }

        const menu = document.getElementById("navProfileMenu");

        if (menu && !menu.hidden) {
            setProfileMenuOpen(false);
            document.getElementById("navProfileBtn").focus();
        }
    });

    document.addEventListener("click", function (event) {
        const menu = document.getElementById("navProfileMenu");
        const button = document.getElementById("navProfileBtn");

        if (
            menu &&
            !menu.hidden &&
            !menu.contains(event.target) &&
            button &&
            !button.contains(event.target)
        ) {
            setProfileMenuOpen(false);
        }

        const link =
            event.target.closest &&
            event.target.closest('a[aria-disabled="true"]');

        if (link) {
            event.preventDefault();
        }
    });

    window.addEventListener("resize", function () {
        if (window.innerWidth > 960) {
            setMenuOpen(false);
        }
    });
}


// ============================================================
// 7. RENDER NAVBAR AND FOOTER
// ============================================================

function renderChrome() {
    const currentPage =
        window.location.pathname.split("/").pop() || "home.html";

    const headerSlot = document.getElementById("siteHeader");
    const footerSlot = document.getElementById("siteFooter");

    if (headerSlot) {
        headerSlot.innerHTML = buildNavbar(currentPage);
    }

    if (footerSlot) {
        footerSlot.innerHTML = buildFooter();
    }

    setupNavToggle();
    setupProfileMenu();
}


// ============================================================
// 8. PAGE INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
    renderChrome();
    setupDocumentListeners();
    verifySession();
});
