const mongoose = require('mongoose');
const { STATUS_VALUES, MIN_REWARD } = require('../config/constants');

const { ObjectId } = mongoose.Schema.Types;

const parcelRequestSchema = new mongoose.Schema(
  {
    requesterId: { type: ObjectId, ref: 'User', required: true, index: true },
    deliveryPartnerId: { type: ObjectId, ref: 'User', default: null, index: true },
    pickupLocation: { type: String, required: true, trim: true, maxlength: 200 },
    dropLocation: { type: String, required: true, trim: true, maxlength: 200 },
    reward: { type: Number, required: true, min: [MIN_REWARD, `Reward must be at least ₹${MIN_REWARD}`] },
    deadline: { type: Date, required: true },
    companyName: { type: String, required: true, trim: true, maxlength: 100 },
    agentName: { type: String, trim: true, maxlength: 100, default: '' },
    agentMobile: {
      type: String,
      trim: true,
      default: '',
      match: [/^\d{10}$/, 'Agent mobile must be exactly 10 digits'], // '' is allowed (optional)
    },
    pickupOtp: { type: String, required: true, trim: true, maxlength: 10 },
    itemDescription: { type: String, trim: true, maxlength: 1000, default: '' },
    status: { type: String, enum: STATUS_VALUES, default: 'pending', index: true },
    acceptedAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    outForDeliveryAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

parcelRequestSchema.index({ status: 1, deadline: 1 });
parcelRequestSchema.index({ requesterId: 1, createdAt: -1 });
parcelRequestSchema.index({ deliveryPartnerId: 1, status: 1 });

module.exports =
  mongoose.models.ParcelRequest || mongoose.model('ParcelRequest', parcelRequestSchema);
