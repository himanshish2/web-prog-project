const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const config = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const { sendVerificationEmail } = require('../utils/mailer');
const { requireAuth } = require('../middleware/authMiddleware');
const { str, normalizeMobile, isEmail, throwValidation } = require('../utils/validators');

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
// Used to keep login timing similar whether or not the account exists
const DUMMY_HASH = bcrypt.hashSync('campuscarry-dummy-password', BCRYPT_ROUNDS);

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');

const regenerateSession = (req) =>
  new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
const saveSession = (req) =>
  new Promise((resolve, reject) => req.session.save((e) => (e ? reject(e) : resolve())));

function emailDomainAllowed(email) {
  if (!config.allowedEmailDomains.length) return true;
  const domain = email.split('@')[1];
  return config.allowedEmailDomains.includes(domain);
}

async function issueVerificationToken(user) {
  const token = crypto.randomBytes(32).toString('hex');
  user.emailVerificationTokenHash = sha256(token);
  user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_TTL_MS);
  await user.save();
  return token;
}

async function emailVerificationLink(user) {
  const token = await issueVerificationToken(user);
  const link = `${config.backendUrl}/api/auth/verify-email?token=${token}`;
  await sendVerificationEmail(user.email, user.name, link);
}

// POST /api/auth/register
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const name = str(b.name);
    const enrollmentNo = str(b.enrollmentNo);
    const email = str(b.email).toLowerCase();
    const course = str(b.course);
    const batch = str(b.batch);
    const hostel = str(b.hostel);
    const mobileNo = normalizeMobile(b.mobileNo);
    const password = typeof b.password === 'string' ? b.password : '';

    const errors = [];
    if (name.length < 2 || name.length > 100)
      errors.push({ field: 'name', message: 'Name must be 2-100 characters' });
    if (!/^\d{6}$/.test(enrollmentNo))
      errors.push({ field: 'enrollmentNo', message: 'Enrollment number must be exactly 6 digits' });
    if (!isEmail(email)) errors.push({ field: 'email', message: 'Enter a valid email address' });
    else if (!emailDomainAllowed(email))
      errors.push({
        field: 'email',
        message: `Use your university email (${config.allowedEmailDomains.map((d) => '@' + d).join(', ')})`,
      });
    if (!course || course.length > 100)
      errors.push({ field: 'course', message: 'Course is required' });
    if (!batch || batch.length > 20) errors.push({ field: 'batch', message: 'Batch is required' });
    if (!hostel || hostel.length > 20)
      errors.push({ field: 'hostel', message: 'Hostel is required' });
    if (!/^\d{10}$/.test(mobileNo))
      errors.push({ field: 'mobileNo', message: 'Mobile number must be exactly 10 digits' });
    if (password.length < 8 || password.length > 72)
      errors.push({ field: 'password', message: 'Password must be 8-72 characters' });
    throwValidation(errors);

    if (await User.exists({ email }))
      throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
    if (await User.exists({ enrollmentNo }))
      throw new AppError(409, 'ENROLLMENT_EXISTS', 'An account with this enrollment number already exists');

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      name,
      enrollmentNo,
      email,
      course,
      batch,
      hostel,
      mobileNo,
      passwordHash,
      role: 'student', // never taken from the request body
      isVerified: !config.requireEmailVerification,
    });

    let emailSent = false;
    if (config.requireEmailVerification) {
      try {
        const doc = await User.findById(user._id).select(
          '+emailVerificationTokenHash +emailVerificationExpires'
        );
        await emailVerificationLink(doc);
        emailSent = true;
      } catch (err) {
        console.error('[auth] could not send verification email:', err.message);
      }
    }

    return ok(
      res,
      {
        user: user.toJSON(),
        verificationRequired: config.requireEmailVerification,
        verificationEmailSent: emailSent,
      },
      201
    );
  })
);

// GET /api/auth/verify-email?token=...   (link clicked from the email)
router.get(
  '/verify-email',
  asyncHandler(async (req, res) => {
    const redirect = (result) => {
      const url = new URL(config.verifyRedirectPath, config.clientUrl + '/');
      url.searchParams.set('verified', result);
      return res.redirect(url.toString());
    };

    const token = str(req.query.token);
    if (!/^[a-f\d]{64}$/i.test(token)) return redirect('false');

    const user = await User.findOne({
      emailVerificationTokenHash: sha256(token),
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationTokenHash +emailVerificationExpires');

    if (!user) return redirect('false');

    user.isVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    return redirect('true');
  })
);

// POST /api/auth/resend-verification   { email }
router.post(
  '/resend-verification',
  asyncHandler(async (req, res) => {
    const email = str((req.body || {}).email).toLowerCase();
    if (isEmail(email)) {
      const user = await User.findOne({ email }).select(
        '+emailVerificationTokenHash +emailVerificationExpires'
      );
      if (user && !user.isVerified) {
        try {
          await emailVerificationLink(user);
        } catch (err) {
          console.error('[auth] resend failed:', err.message);
        }
      }
    }
    // Same answer whether or not the account exists (prevents account enumeration)
    return ok(res, { message: 'If this account exists and is unverified, a new link has been sent.' });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = str((req.body || {}).email).toLowerCase();
    const password = typeof (req.body || {}).password === 'string' ? req.body.password : '';
    if (!email || !password)
      throw new AppError(400, 'VALIDATION_ERROR', 'Email and password are required');

    const user = await User.findOne({ email }).select('+passwordHash');
    console.log('[LOGIN DEBUG] User found:', !!user);
    console.log('[LOGIN DEBUG] Password hash exists:', !!user?.passwordHash);
    const match = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !match)
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');

    if (config.requireEmailVerification && !user.isVerified)
      throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email before logging in');
    
    console.log('[LOGIN DEBUG] Password matched. Regenerating session...');
    await regenerateSession(req); // prevents session fixation
    console.log('[LOGIN DEBUG] Session regenerated successfully');
    req.session.userId = String(user._id);
    await saveSession(req);
    console.log('[LOGIN DEBUG] Session saved successfully');

    return ok(res, { user: user.toJSON() });
  })
);

// POST /api/auth/logout
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const { name, ...cookieOpts } = config.cookie;
    await new Promise((resolve) => (req.session ? req.session.destroy(resolve) : resolve()));
    res.clearCookie(name, {
      httpOnly: cookieOpts.httpOnly,
      sameSite: cookieOpts.sameSite,
      secure: cookieOpts.secure,
    });
    return ok(res, { loggedOut: true });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => ok(res, { user: req.user.toJSON() }))
);

module.exports = router;
