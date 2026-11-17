// Usage:  ADMIN_EMAIL=... ADMIN_PASSWORD=... [ADMIN_NAME=...] npm run create-admin
// Creates an admin account (or promotes an existing user). No hardcoded credentials.
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const config = require('../config/env');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = (process.env.ADMIN_NAME || 'Administrator').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Set a valid ADMIN_EMAIL');
  if (password.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters');

  await connectDB();
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    existing.isVerified = true;
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`Updated existing user ${email} -> admin`);
  } else {
    await User.create({ name, email, passwordHash, role: 'admin', isVerified: true });
    console.log(`Created admin ${email}`);
  }
  await mongoose.connection.close();
})().catch(async (err) => {
  console.error('create-admin failed:', err.message);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
