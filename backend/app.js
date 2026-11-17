const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const config = require('./config/env');
const routes = require('./routes');
const { fail } = require('./utils/response');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// `sessionStore` is injected by server.js (MongoDB). Tests may omit it.
function createApp({ sessionStore } = {}) {
  const app = express();

  if (config.trustProxy) app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');
  app.use(helmet());

  const allowedOrigins = new Set([...config.clientOrigins, new URL(config.backendUrl).origin]);

  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || allowedOrigins.has(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );

  app.use(express.json({ limit: '50kb' }));

  app.use(
    session({
      name: config.cookie.name,
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        httpOnly: config.cookie.httpOnly,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        maxAge: config.cookie.maxAge,
      },
    })
  );

  // CSRF defence: refuse state-changing requests that come from an unknown origin
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (origin && !allowedOrigins.has(origin)) {
      return fail(res, 403, 'ORIGIN_NOT_ALLOWED', 'Request origin is not allowed');
    }
    next();
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => fail(res, 429, 'RATE_LIMITED', 'Too many requests, please slow down'),
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) =>
      fail(res, 429, 'RATE_LIMITED', 'Too many attempts, please try again in a few minutes'),
  });

  app.use('/api', apiLimiter);
  app.use(['/api/auth/login', '/api/auth/register', '/api/auth/resend-verification'], authLimiter);

  app.use('/api', routes);
  app.use('/api', notFoundHandler);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
