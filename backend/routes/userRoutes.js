const express = require('express');
const ParcelRequest = require('../models/ParcelRequest');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const AppError = require('../utils/AppError');
const { requireAuth } = require('../middleware/authMiddleware');
const { serializeRequest } = require('../utils/serializers');
const { str, normalizeMobile, parseLimit, throwValidation } = require('../utils/validators');
const { STATUS_VALUES } = require('../config/constants');

const router = express.Router();
router.use(requireAuth);

// GET /api/users/me
router.get(
  '/me',
  asyncHandler(async (req, res) => ok(res, req.user.toJSON()))
);

// PATCH /api/users/me  - only these fields may be changed
router.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const updates = {};
    const errors = [];

    if (b.name !== undefined) {
      const v = str(b.name);
      if (v.length < 2 || v.length > 100)
        errors.push({ field: 'name', message: 'Name must be 2-100 characters' });
      else updates.name = v;
    }
    if (b.course !== undefined) {
      const v = str(b.course);
      if (!v || v.length > 100) errors.push({ field: 'course', message: 'Course is required' });
      else updates.course = v;
    }
    if (b.batch !== undefined) {
      const v = str(b.batch);
      if (!v || v.length > 20) errors.push({ field: 'batch', message: 'Batch is required' });
      else updates.batch = v;
    }
    if (b.hostel !== undefined) {
      const v = str(b.hostel);
      if (!v || v.length > 20) errors.push({ field: 'hostel', message: 'Hostel is required' });
      else updates.hostel = v;
    }
    if (b.mobileNo !== undefined) {
      const v = normalizeMobile(b.mobileNo);
      if (!/^\d{10}$/.test(v))
        errors.push({ field: 'mobileNo', message: 'Mobile number must be exactly 10 digits' });
      else updates.mobileNo = v;
    }
    throwValidation(errors);

    if (!Object.keys(updates).length) {
      throw new AppError(
        400,
        'NO_VALID_FIELDS',
        'Provide at least one editable field: name, course, batch, hostel, mobileNo'
      );
    }

    Object.assign(req.user, updates);
    await req.user.save();
    return ok(res, req.user.toJSON());
  })
);

// GET /api/users/me/deliveries   (returns all past deliveries: successful & cancelled/failed by default)
router.get(
  '/me/deliveries',
  asyncHandler(async (req, res) => {
    const statusParam = req.query.status ? str(String(req.query.status)) : 'all';
    let filter = { deliveryPartnerId: req.user._id };

    if (statusParam && statusParam !== 'all' && statusParam !== 'past') {
      if (!STATUS_VALUES.includes(statusParam))
        throw new AppError(400, 'INVALID_STATUS', 'Unknown status filter');
      filter.status = statusParam;
    } else {
      // Returns past deliveries: both delivered and cancelled/expired
      filter.status = { $in: ['delivered', 'cancelled', 'expired'] };
    }

    const rows = await ParcelRequest.find(filter)
      .sort({ deliveredAt: -1, cancelledAt: -1, updatedAt: -1, createdAt: -1 })
      .limit(parseLimit(req.query.limit, 100, 200))
      .populate('requesterId', 'name hostel')
      .lean();

    return ok(res, rows.map((r) => serializeRequest(r, 'participant')));
  })
);

// GET /api/users/me/earnings
router.get(
  '/me/earnings',
  asyncHandler(async (req, res) => {
    const [agg] = await ParcelRequest.aggregate([
      { $match: { deliveryPartnerId: req.user._id, status: 'delivered' } },
      { $group: { _id: null, totalEarned: { $sum: '$reward' }, deliveriesCompleted: { $sum: 1 } } },
    ]);

    const aggregated = agg ? agg.totalEarned : 0;
    const userStored = req.user.earnings || 0;
    const totalEarned = Math.max(aggregated, userStored);

    return ok(res, {
      totalEarned,
      deliveriesCompleted: agg ? agg.deliveriesCompleted : 0,
      currency: 'INR',
    });
  })
);

module.exports = router;
