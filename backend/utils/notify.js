const Notification = require('../models/Notification');

// Notification failures must never break the main request.
async function notify({ userId, requestId, type, message }) {
  try {
    await Notification.create({ userId, requestId, type, message });
  } catch (err) {
    console.error('[notify] failed to create notification:', err.message);
  }
}

module.exports = notify;
