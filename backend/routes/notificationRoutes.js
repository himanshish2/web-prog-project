const express = require('express');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { ok } = require('../utils/response');
const { requireAuth, validateId } = require('../middleware/authMiddleware');
const { serializeNotification } = require('../utils/serializers');
const { parseLimit } = require('../utils/validators');

const router = express.Router();
router.use(requireAuth);

// GET /api/notifications   (optional ?unread=true&limit=50)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = { userId: req.user._id };
    if (String(req.query.unread || '').toLowerCase() === 'true') filter.isRead = false;

    const rows = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseLimit(req.query.limit, 50, 200))
      .lean();
    return ok(res, rows.map(serializeNotification));
  })
);

// PATCH /api/notifications/read-all   (convenience)
router.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    const result = await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    return ok(res, { updated: result.modifiedCount });
  })
);

// PATCH /api/notifications/:id/read
router.patch(
  '/:id/read',
  validateId('id'),
  asyncHandler(async (req, res) => {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id }, // users can only touch their own
      { $set: { isRead: true } },
      { new: true }
    ).lean();
    if (!n) throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    return ok(res, serializeNotification(n));
  })
);

module.exports = router;
