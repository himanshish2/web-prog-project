const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const messageSchema = new mongoose.Schema(
  {
    requestId: { type: ObjectId, ref: 'ParcelRequest', required: true },
    senderId: { type: ObjectId, ref: 'User', required: true },
    receiverId: { type: ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.index({ requestId: 1, createdAt: 1 });

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
