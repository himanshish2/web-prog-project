const mongoose = require('mongoose');
const { ROLES } = require('../config/constants');

const isStudent = function () {
  return this.role === 'student';
};

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    // Required for students only (admins are created by script and have no enrollment number)
    enrollmentNo: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      required: isStudent,
      match: [/^\d{6}$/, 'Enrollment number must be exactly 6 digits'],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    course: { type: String, trim: true, maxlength: 100, required: isStudent },
    batch: { type: String, trim: true, maxlength: 20, required: isStudent },
    hostel: { type: String, trim: true, maxlength: 20, required: isStudent },
    mobileNo: {
      type: String,
      trim: true,
      required: isStudent,
      match: [/^\d{10}$/, 'Mobile number must be exactly 10 digits'],
    },
    passwordHash: { type: String, required: true, select: false },
    isVerified: { type: Boolean, default: false },
    role: { type: String, enum: ROLES, default: 'student' },

    // Email verification (stored hashed; never returned)
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.emailVerificationTokenHash;
    delete ret.emailVerificationExpires;
    return ret;
  },
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
