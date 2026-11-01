// backend/server.js

/**
 * Express backend for CampusCarry admin dashboard.
 * Now uses MongoDB (via Mongoose) instead of a local JSON file.
 * Provides endpoints to create orders, list all orders, get statistics,
 * and export an Excel report. All routes keep the same signatures as before
 * so the existing front‑end code works unchanged.
 */

const express = require('express');
const cors = require('cors');
const basicAuth = require('basic-auth');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3002; // using the alternative port we started on

// ---------------------------------------------------
// Middleware
// ---------------------------------------------------
app.use(cors()); // allow calls from frontend on any origin
app.use(express.json()); // parse JSON bodies

// ---------------------------------------------------
// Simple hard‑coded admin credentials (change for production)
// ---------------------------------------------------
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';
function adminAuth(req, res, next) {
  const credentials = basicAuth(req);
  if (!credentials || credentials.name !== ADMIN_USER || credentials.pass !== ADMIN_PASS) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication required.');
  }
  next();
}

// ---------------------------------------------------
// MongoDB connection & Order model
// ---------------------------------------------------
// Use MONGODB_URI env var or fall back to a local dev instance.
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campuscarry';
mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  status: { type: String, enum: ['received', 'completed', 'lost', 'late'], required: true },
  feedback: { type: String, default: '' },
});

const Order = mongoose.model('Order', orderSchema);

// ---------------------------------------------------
// API routes (same signatures as the previous JSON version)
// ---------------------------------------------------
/**
 * POST /order
 * Create a new order or update an existing one (upsert).
 */
app.post('/order', async (req, res) => {
  const { id, status, feedback } = req.body;
  if (!id || !status) {
    return res.status(400).json({ error: 'Missing required fields (id, status).' });
  }
  try {
    const order = await Order.findOneAndUpdate(
      { id },
      { status, feedback: feedback || '' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ message: 'Order stored.', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error.' });
  }
});

/**
 * GET /orders – admin only
 */
app.get('/orders', adminAuth, async (req, res) => {
  try {
    const orders = await Order.find().lean();
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error.' });
  }
});

/**
 * GET /stats – admin only
 * Returns a counts object for each status and total feedback entries.
 */
app.get('/stats', adminAuth, async (req, res) => {
  try {
    const aggregation = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]);
    const stats = { received: 0, completed: 0, lost: 0, late: 0, feedbackCount: 0 };
    aggregation.forEach(item => {
      if (stats[item.status] !== undefined) stats[item.status] = item.count;
    });
    const feedbackCnt = await Order.countDocuments({ feedback: { $ne: '' } });
    stats.feedbackCount = feedbackCnt;
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error.' });
  }
});

/**
 * GET /export – admin only
 * Generates an Excel workbook with raw order data and a summary sheet.
 */
app.get('/export', adminAuth, async (req, res) => {
  try {
    const orders = await Order.find().lean();
    const workbook = new ExcelJS.Workbook();

    // Sheet 1 – raw data
    const dataSheet = workbook.addWorksheet('Orders');
    dataSheet.columns = [
      { header: 'Order ID', key: 'id', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Feedback', key: 'feedback', width: 40 },
    ];
    dataSheet.addRows(orders);

    // Sheet 2 – summary
    const summary = workbook.addWorksheet('Summary');
    const summaryStats = {
      Received: orders.filter(o => o.status === 'received').length,
      Completed: orders.filter(o => o.status === 'completed').length,
      Lost: orders.filter(o => o.status === 'lost').length,
      Late: orders.filter(o => o.status === 'late').length,
      Feedbacks: orders.filter(o => o.feedback && o.feedback.trim().length > 0).length,
    };
    summary.addRow(['Metric', 'Count']);
    Object.entries(summaryStats).forEach(([k, v]) => summary.addRow([k, v]));

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="CampusCarry_Orders.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating report');
  }
});

// Simple health endpoint
app.get('/ping', (req, res) => res.send('pong'));

app.listen(PORT, () => {
  console.log(`CampusCarry backend listening on http://localhost:${PORT}`);
});
