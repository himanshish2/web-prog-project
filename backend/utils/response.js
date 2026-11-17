// Standard response envelopes (see Backend Standards section 8).
const ok = (res, data, status = 200, extra = {}) =>
  res.status(status).json({ success: true, data, ...extra });

const fail = (res, status, code, message, details) =>
  res.status(status).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });

module.exports = { ok, fail };
