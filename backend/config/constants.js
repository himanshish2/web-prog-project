const STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PICKED_UP: 'picked_up',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
});

const STATUS_VALUES = Object.values(STATUS);

const STATUS_LABEL = Object.freeze({
  pending: 'Waiting for Delivery Partner',
  accepted: 'Accepted',
  picked_up: 'Picked Up',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  expired: 'Expired',
});

// current status -> the only status it may advance to (set by the delivery partner)
const NEXT_STATUS = Object.freeze({
  accepted: 'picked_up',
  picked_up: 'out_for_delivery',
  out_for_delivery: 'delivered',
});

// target status -> timestamp field to fill in
const STATUS_TIMESTAMP = Object.freeze({
  picked_up: 'pickedUpAt',
  out_for_delivery: 'outForDeliveryAt',
  delivered: 'deliveredAt',
});

const TERMINAL_STATUSES = Object.freeze(['delivered', 'cancelled', 'expired']);
const CHAT_OPEN_STATUSES = Object.freeze(['accepted', 'picked_up', 'out_for_delivery']);

const NOTIFICATION_TYPES = Object.freeze([
  'request_accepted',
  'status_updated',
  'new_message',
  'request_cancelled',
]);

const ROLES = Object.freeze(['student', 'admin']);

module.exports = {
  STATUS,
  STATUS_VALUES,
  STATUS_LABEL,
  NEXT_STATUS,
  STATUS_TIMESTAMP,
  TERMINAL_STATUSES,
  CHAT_OPEN_STATUSES,
  NOTIFICATION_TYPES,
  ROLES,
  MIN_REWARD: 10,
  MAX_REWARD: 100000,
  URGENT_AFTER_MINUTES: 30,
};
