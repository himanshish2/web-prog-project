const User = require('../models/User');
const config = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { isObjectId } = require('../utils/validators');

// Server-side session check. The browser only holds an opaque, HttpOnly session cookie.
const requireAuth = asyncHandler(async (req, res, next) => {
  const userId = req.session && req.session.userId;
  if (!userId) throw new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue');

  const user = await User.findById(userId);
  if (!user) {
    await new Promise((resolve) => req.session.destroy(resolve));
    throw new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue');
  }
  if (config.requireEmailVerification && !user.isVerified) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email address first');
  }
  req.user = user;
  next();
});

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError(403, 'FORBIDDEN', 'Administrator access required'));
  }
  next();
};

// Validates :param as a MongoDB ObjectId before any query runs.
const validateId =
  (param = 'id') =>
  (req, res, next) => {
    if (!isObjectId(req.params[param])) {
      return next(new AppError(400, 'INVALID_ID', 'Invalid identifier'));
    }
    next();
  };

module.exports = { requireAuth, requireAdmin, validateId };
