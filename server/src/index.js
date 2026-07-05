require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const roleRoutes = require('./routes/role.routes');
const candidateRoutes = require('./routes/candidate.routes');
const emailRoutes = require('./routes/email.routes');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// --- Middleware ---
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Serve uploaded resumes statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- Routes ---
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.use('/api/auth', authRoutes);
app.use('/api', roleRoutes);
app.use('/api', candidateRoutes);
app.use('/api/email', emailRoutes);

// --- Error Handler (must be last) ---
app.use(errorHandler);

// --- Boot ---
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 TalentForce JD API running on http://localhost:${PORT}`);
  });
});
