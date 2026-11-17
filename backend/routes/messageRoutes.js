const express = require('express');
const ParcelRequest = require('../models/ParcelRequest');
const Message = require('../models/Message');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const notify = require('../utils/notify');
const { ok } = require('../utils/response');
const { requireAuth, validateId } = require('../middleware/authMiddleware');
const { serializeMessage } = require('../utils/serializers');
const { str, parseLimit } = require('../utils/validators');
const { CHAT_OPEN_STATUSES } = require('../config/constants');

// Mounted at /api/requests  ->  /api/requests/:id/messages
const router = express.Router();
router.use(requireAuth);

// Loads the request and confirms the user is the requester or the assigned partner.
async function loadForParticipant(requestId, userId) {
  const r = await ParcelRequest.findById(requestId)
    .select('requesterId deliveryPartnerId status')
    .lean();
  if (!r) throw new AppError(404, 'REQUEST_NOT_FOUND', 'Parcel request not found');
  const me = String(userId);
  const isRequester = String(r.requesterId) === me;
  const isPartner = r.deliveryPartnerId && String(r.deliveryPartnerId) === me;
  if (!isRequester && !isPartner)
    throw new AppError(403, 'FORBIDDEN', 'Only the requester and delivery partner can access these messages');
  return r;
}

// GET /api/requests/:id/messages   (optional ?after=<ISO date> for polling)
router.get(
  '/:id/messages',
  validateId('id'),
  asyncHandler(async (req, res) => {
    await loadForParticipant(req.params.id, req.user._id);

    const filter = { requestId: req.params.id };
    if (req.query.after) {
      const after = new Date(String(req.query.after));
      if (Number.isNaN(after.getTime()))
        throw new AppError(400, 'VALIDATION_ERROR', '"after" must be an ISO 8601 date');
      filter.createdAt = { $gt: after };
    }

    const rows = await Message.find(filter)
      .sort({ createdAt: 1, _id: 1 }) // chronological
      .limit(parseLimit(req.query.limit, 500, 1000))
      .lean();
    return ok(res, rows.map((m) => serializeMessage(m, req.user._id)));
  })
);

// POST /api/requests/:id/messages   { text }
router.post(
  '/:id/messages',
  validateId('id'),
  asyncHandler(async (req, res) => {
    const r = await loadForParticipant(req.params.id, req.user._id);

    if (!r.deliveryPartnerId)
      throw new AppError(409, 'NO_DELIVERY_PARTNER', 'Messaging opens once a delivery partner accepts the request');
    if (!CHAT_OPEN_STATUSES.includes(r.status))
      throw new AppError(409, 'CHAT_CLOSED', `Messaging is closed for ${r.status} requests`);

    const text = str((req.body || {}).text);
    if (!text) throw new AppError(400, 'VALIDATION_ERROR', 'Message text is required');
    if (text.length > 1000)
      throw new AppError(400, 'VALIDATION_ERROR', 'Message cannot exceed 1000 characters');

    const me = String(req.user._id);
    const receiverId = String(r.requesterId) === me ? r.deliveryPartnerId : r.requesterId;

    const msg = await Message.create({
      requestId: r._id,
      senderId: req.user._id, // from the session
      receiverId,
      text,
    });

    await notify({
      userId: receiverId,
      requestId: r._id,
      type: 'new_message',
      message: `New message from ${req.user.name}`,
    });

    return ok(res, serializeMessage(msg.toObject(), req.user._id), 201);
  })
);

module.exports = router;
