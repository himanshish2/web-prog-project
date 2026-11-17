const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const config = require('./config/env');
const connectDB = require('./config/db');
const createApp = require('./app');
const { expireOverdueRequests } = require('./utils/expiry');

async function start() {
  await connectDB();

  const sessionStore = MongoStore.create({
    client: mongoose.connection.getClient(),
    dbName: config.dbName,
    collectionName: 'sessions',
    ttl: config.cookie.maxAge / 1000,
  });

  const app = createApp({ sessionStore });
  const server = app.listen(config.port, () => {
    console.log(`[server] CampusCarry API listening on port ${config.port}`);
  });

  // Mark overdue pending requests as expired every minute
  const timer = setInterval(() => {
    expireOverdueRequests().catch((e) => console.error('[expiry]', e.message));
  }, 60 * 1000);
  timer.unref();

  const shutdown = async (signal) => {
    console.log(`[server] ${signal} received, shutting down`);
    clearInterval(timer);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('[server] Failed to start:', err.message);
  process.exit(1);
});
