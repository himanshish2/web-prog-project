const AppError = require('./AppError');

const OBJECT_ID = /^[a-f\d]{24}$/i;

const isObjectId = (v) => typeof v === 'string' && OBJECT_ID.test(v);

// Returns a trimmed string, or '' if the value is not a string.
const str = (v) => (typeof v === 'string' ? v.trim() : '');

// Accepts "9876543210", "+91 98765-43210", "919876543210" -> "9876543210"
function normalizeMobile(v) {
  if (typeof v !== 'string' && typeof v !== 'number') return '';
  let digits = String(v).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;

function parseLimit(value, def = 50, max = 100) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(n, max);
}

function parsePage(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function throwValidation(errors) {
  if (errors.length) {
    throw new AppError(400, 'VALIDATION_ERROR', errors[0].message, errors);
  }
}

module.exports = {
  isObjectId,
  str,
  normalizeMobile,
  isEmail,
  parseLimit,
  parsePage,
  throwValidation,
};
