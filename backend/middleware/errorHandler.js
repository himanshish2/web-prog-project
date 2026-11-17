const { fail } = require('../utils/response');

function notFoundHandler(req, res) {
  return fail(res, 404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.isAppError) return fail(res, err.status, err.code, err.message, err.details);

  if (err.type === 'entity.parse.failed') {
    return fail(res, 400, 'INVALID_JSON', 'Request body is not valid JSON');
  }
  if (err.type === 'entity.too.large') {
    return fail(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return fail(res, 400, 'VALIDATION_ERROR', details[0].message, details);
  }
  if (err.name === 'CastError') {
    return fail(res, 400, 'INVALID_INPUT', 'Invalid value supplied');
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    const labels = { email: 'EMAIL_EXISTS', enrollmentNo: 'ENROLLMENT_EXISTS' };
    return fail(res, 409, labels[field] || 'DUPLICATE_KEY', `An account with this ${field} already exists`);
  }

  console.error('[error]', err);
  return fail(res, 500, 'INTERNAL_ERROR', 'Something went wrong on the server');
}

module.exports = { notFoundHandler, errorHandler };
