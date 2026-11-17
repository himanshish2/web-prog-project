const ParcelRequest = require('../models/ParcelRequest');
const notify = require('./notify');

// Marks pending requests whose deadline has passed as "expired".
// Each request is flipped atomically so it is only processed (and notified) once.
async function expireOverdueRequests() {
  const overdue = await ParcelRequest.find({
    status: 'pending',
    deadline: { $lte: new Date() },
  })
    .select('_id requesterId pickupLocation dropLocation')
    .lean();

  for (const r of overdue) {
    const updated = await ParcelRequest.findOneAndUpdate(
      { _id: r._id, status: 'pending' },
      { $set: { status: 'expired' } },
      { new: true }
    ).lean();
    if (updated) {
      await notify({
        userId: r.requesterId,
        requestId: r._id,
        type: 'status_updated',
        message: `Your parcel request from ${r.pickupLocation} to ${r.dropLocation} expired because no delivery partner accepted it in time.`,
      });
    }
  }
  return overdue.length;
}

module.exports = { expireOverdueRequests };
