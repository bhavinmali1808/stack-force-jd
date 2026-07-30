const mongoose = require('mongoose');

const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  const tryConnect = async (attempt = 1) => {
    try {
      const conn = await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    } catch (err) {
      console.error(`❌ MongoDB attempt ${attempt} failed: ${err.message}`);
      console.log(`🔁 Retrying in 5s...`);
      setTimeout(() => tryConnect(attempt + 1), 5000);
    }
  };
  await tryConnect();
};

module.exports = { connectDB };
