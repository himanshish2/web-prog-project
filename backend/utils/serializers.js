// Turns lean Mongo documents into the JSON shapes the frontend receives.
// Keeps IDs as strings, hides sensitive fields, never exposes passwordHash.
const { TERMINAL_STATUSES, URGENT_AFTER_MINUTES } = require('../config/constants');

// Works for ObjectId, populated user object, or null
const idOf = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && v.name !== undefined && v._id) return String(v._id);
  return String(v);
};

const isPopulated = (u) => u && typeof u === 'object' && u.name !== undefined;

function userBrief(u, admin = false) {
  if (!u) return null;
  if (!isPopulated(u)) return { id: String(u) };
  const out = { id: String(u._id), name: u.name, hostel: u.hostel };
  if (admin) {
    out.email = u.email;
    out.enrollmentNo = u.enrollmentNo;
  }
  return out;
}

const dateOrNull = (d) => d ?? null;

function isUrgent(r, now = Date.now()) {
  return (
    r.status === 'pending' &&
    new Date(r.deadline).getTime() > now &&
    new Date(r.createdAt).getTime() <= now - URGENT_AFTER_MINUTES * 60 * 1000
  );
}

/**
 * mode:
 *  'public'      - Available Requests list. No courier agent details, no OTP.
 *  'participant' - requester or assigned partner. Courier details, plus the pickup
 *                  OTP while the request is still active.
 *  'admin'       - everything except the OTP.
 */
function serializeRequest(r, mode = 'public') {
  const admin = mode === 'admin';
  const out = {
    id: String(r._id),
    requesterId: idOf(r.requesterId),
    deliveryPartnerId: idOf(r.deliveryPartnerId),
    requester: userBrief(r.requesterId, admin),
    deliveryPartner: userBrief(r.deliveryPartnerId, admin),
    pickupLocation: r.pickupLocation,
    dropLocation: r.dropLocation,
    reward: r.reward,
    deadline: r.deadline,
    companyName: r.companyName,
    itemDescription: r.itemDescription,
    status: r.status,
    isUrgent: isUrgent(r),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    acceptedAt: dateOrNull(r.acceptedAt),
    pickedUpAt: dateOrNull(r.pickedUpAt),
    outForDeliveryAt: dateOrNull(r.outForDeliveryAt),
    deliveredAt: dateOrNull(r.deliveredAt),
    cancelledAt: dateOrNull(r.cancelledAt),
  };
  if (mode !== 'public') {
    out.agentName = r.agentName;
    out.agentMobile = r.agentMobile;
  }
  if (mode === 'participant' && !TERMINAL_STATUSES.includes(r.status)) {
    out.pickupOtp = r.pickupOtp;
  }
  return out;
}

function serializeMessage(m, viewerId) {
  return {
    id: String(m._id),
    requestId: String(m.requestId),
    senderId: String(m.senderId),
    receiverId: String(m.receiverId),
    text: m.text,
    createdAt: m.createdAt,
    isMine: viewerId ? String(m.senderId) === String(viewerId) : undefined,
  };
}

function serializeNotification(n) {
  return {
    id: String(n._id),
    userId: String(n.userId),
    requestId: String(n.requestId),
    type: n.type,
    message: n.message,
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}

module.exports = { serializeRequest, serializeMessage, serializeNotification, idOf };
