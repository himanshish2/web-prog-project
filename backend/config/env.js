require('dotenv').config();

const list = (v, fallback = '') =>
  (v ?? fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const missing = ['MONGODB_URI', 'SESSION_SECRET'].filter((k) => !process.env[k]);
if (missing.length) {
  throw new Error(
    `Missing required environment variable(s): ${missing.join(', ')}. Copy .env.example to .env and fill it in.`
  );
}

const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 5000;
const clientOrigins = list(
  process.env.CLIENT_ORIGINS,
  'http://localhost:5500,http://127.0.0.1:5500,https://web-prog-project-black.vercel.app'
).map((o) => o.replace(/\/+$/, ''));

const sameSite = (process.env.COOKIE_SAMESITE || (isProd ? 'none' : 'lax')).toLowerCase();
const secure =
  process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : isProd;

if (sameSite === 'none' && !secure) {
  console.warn(
    '[config] COOKIE_SAMESITE=none requires COOKIE_SECURE=true (HTTPS). Browsers will reject the session cookie otherwise.'
  );
}
if (process.env.SESSION_SECRET.length < 24) {
  console.warn('[config] SESSION_SECRET is short. Use a long random string.');
}

module.exports = {
  isProd,
  port,
  mongoUri: process.env.MONGODB_URI,
  dbName: process.env.DB_NAME || 'campuscarry',
  sessionSecret: process.env.SESSION_SECRET,
  clientOrigins,
  clientUrl: (process.env.CLIENT_URL || clientOrigins[0]).replace(/\/+$/, ''),
  verifyRedirectPath: process.env.VERIFY_REDIRECT_PATH || '/login.html',
  backendUrl: (process.env.BACKEND_URL || `http://localhost:${port}`).replace(/\/+$/, ''),
  allowedEmailDomains: list(process.env.ALLOWED_EMAIL_DOMAINS).map((d) =>
    d.toLowerCase().replace(/^@/, '')
  ),
  requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION !== 'false',
  trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : isProd ? 1 : 0,
  cookie: {
    name: 'campuscarry.sid',
    httpOnly: true,
    sameSite,
    secure,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'CampusCarry <no-reply@campuscarry.example>',
  },
};
