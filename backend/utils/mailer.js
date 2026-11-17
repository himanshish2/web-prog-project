const nodemailer = require('nodemailer');
const config = require('../config/env');

let transporter = null;
if (config.smtp.host) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
}

async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    // Development fallback: no SMTP configured, so print the mail instead.
    console.log(`\n[mail:dev] To: ${to}\n[mail:dev] Subject: ${subject}\n[mail:dev] ${text}\n`);
    return;
  }
  await transporter.sendMail({ from: config.smtp.from, to, subject, text, html });
}

async function sendVerificationEmail(to, name, link) {
  const text = `Hi ${name},\n\nWelcome to CampusCarry! Please verify your email by opening this link (valid for 24 hours):\n\n${link}\n\nIf you did not create this account, ignore this email.`;
  const html = `<p>Hi ${name},</p><p>Welcome to CampusCarry! Please verify your email address (link valid for 24 hours):</p><p><a href="${link}">Verify my email</a></p><p>If you did not create this account, you can ignore this email.</p>`;
  await sendMail({ to, subject: 'Verify your CampusCarry email', text, html });
}

module.exports = { sendMail, sendVerificationEmail };
