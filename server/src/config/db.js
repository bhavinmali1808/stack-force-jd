const mongoose = require('mongoose');

const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.warn('⚠️  MONGO_URI not provided — running server in standalone mode without DB connection.');
    return;
  }
  try {
    const conn = await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    console.warn('⚠️  Continuing server execution without active DB connection...');
  }
};

module.exports = { connectDB };
