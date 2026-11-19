const express = require('express');
const ParcelRequest = require('../models/ParcelRequest');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const notify = require('../utils/notify');
const { ok } = require('../utils/response');
const { expireOverdueRequests } = require('../utils/expiry');
const { requireAuth, validateId } = require('../middleware/authMiddleware');
const { serializeRequest, idOf } = require('../utils/serializers');
const { str, normalizeMobile, parseLimit, throwValidation } = require('../utils/validators');
const {
  STATUS_VALUES,
  STATUS_LABEL,
  NEXT_STATUS,
  STATUS_TIMESTAMP,
  MIN_REWARD,
  MAX_REWARD,
  URGENT_AFTER_MINUTES,
} = require('../config/constants');

const router = express.Router();
router.use(requireAuth);

const USER_FIELDS = 'name hostel';
const ADMIN_USER_FIELDS = 'name hostel email enrollmentNo';

// ---------- POST /api/requests ----------
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const pickupLocation = str(b.pickupLocation);
    const dropLocation = str(b.dropLocation);
    const companyName = str(b.companyName);
    const agentName = str(b.agentName);
    const agentMobile = b.agentMobile ? normalizeMobile(b.agentMobile) : '';
    const pickupOtp = str(typeof b.pickupOtp === 'number' ? String(b.pickupOtp) : b.pickupOtp);
    const itemDescription = str(b.itemDescription);

    // reward: a real number (30) or a plain numeric string ("30"); never "₹30"
    let reward = b.reward;
    if (typeof reward === 'string' && /^\d+(\.\d{1,2})?$/.test(reward.trim())) {
      reward = Number(reward.trim());
    }

    let deadline = null;
    if (typeof b.deadline === 'string' || typeof b.deadline === 'number') {
      const d = new Date(b.deadline);
      if (!Number.isNaN(d.getTime())) deadline = d;
    }

    const errors = [];
    if (!pickupLocation || pickupLocation.length > 200)
      errors.push({ field: 'pickupLocation', message: 'Pickup location is required (max 200 characters)' });
    if (!dropLocation || dropLocation.length > 200)
      errors.push({ field: 'dropLocation', message: 'Drop location is required (max 200 characters)' });
    if (typeof reward !== 'number' || !Number.isFinite(reward) || reward < MIN_REWARD)
      errors.push({ field: 'reward', message: `Reward must be a number of at least ₹${MIN_REWARD}` });
    else if (reward > MAX_REWARD)
      errors.push({ field: 'reward', message: `Reward cannot exceed ₹${MAX_REWARD}` });
    if (!deadline) errors.push({ field: 'deadline', message: 'Deadline must be a valid date/time (ISO 8601)' });
    else if (deadline.getTime() <= Date.now())
      errors.push({ field: 'deadline', message: 'Deadline must be in the future' });
    if (!companyName || companyName.length > 100)
      errors.push({ field: 'companyName', message: 'Courier company name is required' });
    if (agentName.length > 100) errors.push({ field: 'agentName', message: 'Agent name is too long' });
    if (agentMobile && !/^\d{10}$/.test(agentMobile))
      errors.push({ field: 'agentMobile', message: 'Agent mobile must be exactly 10 digits' });
    if (!/^[A-Za-z0-9]{3,10}$/.test(pickupOtp))
      errors.push({ field: 'pickupOtp', message: 'Pickup OTP must be 3-10 letters/digits' });
    if (itemDescription.length > 1000)
      errors.push({ field: 'itemDescription', message: 'Item description is too long (max 1000)' });
    throwValidation(errors);

    const created = await ParcelRequest.create({
      requesterId: req.user._id, // from the session, never from the body
      deliveryPartnerId: null,
      pickupLocation,
      dropLocation,
      reward,
      deadline,
      companyName,
      agentName,
      agentMobile,
      pickupOtp,
      itemDescription,
      status: 'pending',
    });

    const lean = await ParcelRequest.findById(created._id).populate('requesterId', USER_FIELDS).lean();
    return ok(res, serializeRequest(lean, 'participant'), 201);
  })
);

// ---------- GET /api/requests   (?urgent=true) ----------
router.get(
  '/',
  asyncHandler(async (req, res) => {
    await expireOverdueRequests();

    const now = new Date();
    const filter = {
      status: 'pending',
      deadline: { $gt: now },
      requesterId: { $ne: req.user._id }, // students can't accept their own requests
    };
    const urgent = String(req.query.urgent || '').toLowerCase() === 'true';
    if (urgent) {
      filter.createdAt = { $lte: new Date(now.getTime() - URGENT_AFTER_MINUTES * 60 * 1000) };
    }

    const rows = await ParcelRequest.find(filter)
      .sort(urgent ? { deadline: 1 } : { createdAt: -1 })
      .limit(parseLimit(req.query.limit, 50, 100))
      .populate('requesterId', USER_FIELDS)
      .lean();

    return ok(res, rows.map((r) => serializeRequest(r, 'public')));
  })
);

// ---------- GET /api/requests/mine ----------
router.get(
  '/mine',
  asyncHandler(async (req, res) => {
    await expireOverdueRequests();
    const rows = await ParcelRequest.find({ requesterId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(parseLimit(req.query.limit, 100, 200))
      .populate('requesterId', USER_FIELDS)
      .populate('deliveryPartnerId', USER_FIELDS)
      .lean();
    return ok(res, rows.map((r) => serializeRequest(r, 'participant')));
  })
);

// ---------- GET /api/requests/delivering   (optional ?status=) ----------
router.get(
  '/delivering',
  asyncHandler(async (req, res) => {
    const filter = { deliveryPartnerId: req.user._id };
    if (req.query.status) {
      const s = str(String(req.query.status));
      if (!STATUS_VALUES.includes(s)) throw new AppError(400, 'INVALID_STATUS', 'Unknown status filter');
      filter.status = s;
    }
    const rows = await ParcelRequest.find(filter)
      .sort({ acceptedAt: -1 })
      .limit(parseLimit(req.query.limit, 100, 200))
      .populate('requesterId', USER_FIELDS)
      .populate('deliveryPartnerId', USER_FIELDS)
      .lean();
    return ok(res, rows.map((r) => serializeRequest(r, 'participant')));
  })
);

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    await expireOverdueRequests();

    const mine = { requesterId: req.user._id };
    const activeStatuses = [
      'pending', 'accepted', 'picked_up', 'out_for_delivery',
    ];

    const [open, total, delivering, completed] = await Promise.all([
      ParcelRequest.countDocuments({
        ...mine,
        status: { $in: activeStatuses },
      }),
      ParcelRequest.countDocuments(mine),
      ParcelRequest.countDocuments({
        deliveryPartnerId: req.user._id,
        status: { $in: activeStatuses },
      }),
      ParcelRequest.countDocuments({ ...mine, status: 'delivered' }),
    ]);

    return ok(res, { open, total, delivering, completed });
  })
);


// ---------- GET /api/requests/:id ----------
router.get(
  '/:id',
  validateId('id'),
  asyncHandler(async (req, res) => {
    await expireOverdueRequests();

    const isAdmin = req.user.role === 'admin';
    const r = await ParcelRequest.findById(req.params.id)
      .populate('requesterId', isAdmin ? ADMIN_USER_FIELDS : USER_FIELDS)
      .populate('deliveryPartnerId', isAdmin ? ADMIN_USER_FIELDS : USER_FIELDS)
      .lean();
    if (!r) throw new AppError(404, 'REQUEST_NOT_FOUND', 'Parcel request not found');

    const me = String(req.user._id);
    const isParticipant = idOf(r.requesterId) === me || idOf(r.deliveryPartnerId) === me;

    if (isParticipant) return ok(res, serializeRequest(r, 'participant'));
    if (isAdmin) return ok(res, serializeRequest(r, 'admin'));
    // Anyone logged in may see the public view of a still-open request
    if (r.status === 'pending') return ok(res, serializeRequest(r, 'public'));

    throw new AppError(403, 'FORBIDDEN', 'You are not allowed to view this request');
  })
);

// ---------- PATCH /api/requests/:id/accept ----------
router.patch(
  '/:id/accept',
  validateId('id'),
  asyncHandler(async (req, res) => {
    await expireOverdueRequests();
    const now = new Date();

    // Single atomic operation: only one student can ever win this update.
    const updated = await ParcelRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'pending',
        deadline: { $gt: now },
        requesterId: { $ne: req.user._id },
      },
      { $set: { status: 'accepted', deliveryPartnerId: req.user._id, acceptedAt: now } },
      { new: true }
    )
      .populate('requesterId', USER_FIELDS)
      .populate('deliveryPartnerId', USER_FIELDS)
      .lean();

    if (!updated) {
      const existing = await ParcelRequest.findById(req.params.id).select('requesterId status').lean();
      if (!existing) throw new AppError(404, 'REQUEST_NOT_FOUND', 'Parcel request not found');
      if (String(existing.requesterId) === String(req.user._id))
        throw new AppError(403, 'CANNOT_ACCEPT_OWN_REQUEST', 'You cannot accept your own request');
      throw new AppError(
        409,
        'REQUEST_NOT_AVAILABLE',
        existing.status === 'pending'
          ? 'This request has passed its deadline'
          : `This request can no longer be accepted (status: ${existing.status})`
      );
    }

    await notify({
      userId: updated.requesterId._id,
      requestId: updated._id,
      type: 'request_accepted',
      message: `${req.user.name} accepted your parcel request from ${updated.pickupLocation} to ${updated.dropLocation}.`,
    });

    return ok(res, serializeRequest(updated, 'participant'));
  })
);

// ---------- PATCH /api/requests/:id/status   { status } ----------
router.patch(
  '/:id/status',
  validateId('id'),
  asyncHandler(async (req, res) => {
    const target = str((req.body || {}).status);
    const advanceable = Object.values(NEXT_STATUS); // picked_up, out_for_delivery, delivered
    if (!advanceable.includes(target)) {
      throw new AppError(
        400,
        'INVALID_STATUS',
        `Status must be one of: ${advanceable.join(', ')}`
      );
    }

    const r = await ParcelRequest.findById(req.params.id).select('requesterId deliveryPartnerId status').lean();
    if (!r) throw new AppError(404, 'REQUEST_NOT_FOUND', 'Parcel request not found');
    if (!r.deliveryPartnerId || String(r.deliveryPartnerId) !== String(req.user._id))
      throw new AppError(403, 'FORBIDDEN', 'Only the assigned delivery partner can update delivery status');

    const requiredCurrent = Object.keys(NEXT_STATUS).find((k) => NEXT_STATUS[k] === target);
    const conflict = () =>
      new AppError(
        409,
        'INVALID_STATUS_TRANSITION',
        `Cannot move from "${r.status}" to "${target}". Next allowed step: ${NEXT_STATUS[r.status] || 'none'}`
      );
    if (r.status !== requiredCurrent) throw conflict();

    const now = new Date();
    const updated = await ParcelRequest.findOneAndUpdate(
      { _id: r._id, deliveryPartnerId: req.user._id, status: requiredCurrent },
      { $set: { status: target, [STATUS_TIMESTAMP[target]]: now } },
      { new: true }
    )
      .populate('requesterId', USER_FIELDS)
      .populate('deliveryPartnerId', USER_FIELDS)
      .lean();
    if (!updated) throw conflict();

    await notify({
      userId: updated.requesterId._id,
      requestId: updated._id,
      type: 'status_updated',
      message: `Your parcel status is now "${STATUS_LABEL[target]}".`,
    });

    return ok(res, serializeRequest(updated, 'participant'));
  })
);

// ---------- PATCH /api/requests/:id/cancel ----------
router.patch(
  '/:id/cancel',
  validateId('id'),
  asyncHandler(async (req, res) => {
    await expireOverdueRequests();

    const r = await ParcelRequest.findById(req.params.id).select('requesterId status').lean();
    if (!r) throw new AppError(404, 'REQUEST_NOT_FOUND', 'Parcel request not found');
    if (String(r.requesterId) !== String(req.user._id))
      throw new AppError(403, 'FORBIDDEN', 'Only the requester can cancel this request');

    const updated = await ParcelRequest.findOneAndUpdate(
      { _id: r._id, requesterId: req.user._id, status: 'pending' },
      { $set: { status: 'cancelled', cancelledAt: new Date() } },
      { new: true }
    )
      .populate('requesterId', USER_FIELDS)
      .lean();

    if (!updated) {
      throw new AppError(
        409,
        'CANNOT_CANCEL',
        r.status === 'accepted' || r.status === 'picked_up' || r.status === 'out_for_delivery'
          ? 'Cancellation after acceptance is not supported yet'
          : `This request is already ${r.status}`
      );
    }
    return ok(res, serializeRequest(updated, 'participant'));
  })
);

module.exports = router;
