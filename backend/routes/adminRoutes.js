const express = require('express');
const User = require('../models/User');
const ParcelRequest = require('../models/ParcelRequest');
const Message = require('../models/Message');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { ok } = require('../utils/response');
const { expireOverdueRequests } = require('../utils/expiry');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { serializeRequest } = require('../utils/serializers');
const { str, parseLimit, parsePage } = require('../utils/validators');
const { STATUS_VALUES, URGENT_AFTER_MINUTES } = require('../config/constants');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/stats
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    await expireOverdueRequests();
    const now = new Date();

    const [totalUsers, verifiedUsers, statusAgg, rewardAgg, totalMessages, urgentPending] =
      await Promise.all([
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'student', isVerified: true }),
        ParcelRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        ParcelRequest.aggregate([
          { $match: { status: 'delivered' } },
          { $group: { _id: null, total: { $sum: '$reward' } } },
        ]),
        Message.countDocuments({}),
        ParcelRequest.countDocuments({
          status: 'pending',
          deadline: { $gt: now },
          createdAt: { $lte: new Date(now.getTime() - URGENT_AFTER_MINUTES * 60 * 1000) },
        }),
      ]);

    const byStatus = Object.fromEntries(STATUS_VALUES.map((s) => [s, 0]));
    let totalRequests = 0;
    for (const row of statusAgg) {
      byStatus[row._id] = row.count;
      totalRequests += row.count;
    }

    return ok(res, {
      users: { total: totalUsers, verified: verifiedUsers },
      requests: { total: totalRequests, byStatus, urgentPending },
      totalRewardsDelivered: rewardAgg[0] ? rewardAgg[0].total : 0,
      totalMessages,
    });
  })
);

// GET /api/admin/requests   (?status=&page=&limit=)
router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    await expireOverdueRequests();

    const filter = {};
    if (req.query.status) {
      const s = str(String(req.query.status));
      if (!STATUS_VALUES.includes(s)) throw new AppError(400, 'INVALID_STATUS', 'Unknown status filter');
      filter.status = s;
    }
    const limit = parseLimit(req.query.limit, 50, 200);
    const page = parsePage(req.query.page);

    const [rows, total] = await Promise.all([
      ParcelRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('requesterId', 'name hostel email enrollmentNo')
        .populate('deliveryPartnerId', 'name hostel email enrollmentNo')
        .lean(),
      ParcelRequest.countDocuments(filter),
    ]);

    return ok(res, rows.map((r) => serializeRequest(r, 'admin')), 200, {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

module.exports = router;
