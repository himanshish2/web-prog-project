const mongoose = require('mongoose');
const config = require('./env');

async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri, { dbName: config.dbName });
  console.log(`[db] Connected to MongoDB database "${config.dbName}"`);
}

module.exports = connectDB;
