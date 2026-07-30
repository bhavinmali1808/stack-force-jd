require('dotenv').config();
require('express-async-errors');

const http    = require('http');
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const cookieParser = require('cookie-parser');
const compression  = require('compression');
const { Server: SocketIO } = require('socket.io');
const rateLimit = require('express-rate-limit');

const { connectDB } = require('./config/db');
const { getRedis }  = require('./config/redis');
const { verifySmtp } = require('./config/smtp');
const Admin         = require('./models/Admin');

// Routes
const authRoutes      = require('./routes/auth');
const campaignRoutes  = require('./routes/campaigns');
const templateRoutes  = require('./routes/templates');
const audienceRoutes  = require('./routes/audience');
const segmentRoutes   = require('./routes/segments');
const analyticsRoutes = require('./routes/analytics');
const queueRoutes     = require('./routes/queue');
const smtpRoutes      = require('./routes/smtp');
const trackingRoutes  = require('./routes/tracking');

const IS_PROD = process.env.NODE_ENV === 'production';

const app    = express();
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────
const io = new SocketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Attach io to app so routes can emit events
app.set('io', io);

io.on('connection', (socket) => {
  socket.join('dashboard');
  socket.emit('connected', { message: 'Mail platform connected' });
});

// ── Middleware ─────────────────────────────────
app.use(helmet({ contentSecurityPolicy: IS_PROD ? undefined : false }));
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan(IS_PROD ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('trust proxy', true);

// General rate limit
app.use('/api/', rateLimit({ windowMs: 60000, max: 200, standardHeaders: true, legacyHeaders: false }));

// ── Routes ─────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/audience',  audienceRoutes);
app.use('/api/segments',  segmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/queue',     queueRoutes);
app.use('/api/smtp',      smtpRoutes);
app.use('/api/track',     trackingRoutes);  // open pixel + click redirect (no auth)

// Health
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  uptime: process.uptime(),
  timestamp: new Date(),
  env: IS_PROD ? 'production' : 'development',
}));

// ── Error Handler ──────────────────────────────
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  console.error(`[Error] ${req.method} ${req.path} →`, err.message);
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(IS_PROD ? {} : { stack: err.stack }),
  });
});

// ── Seed admin on first run ────────────────────
const seedAdmin = async () => {
  const count = await Admin.countDocuments();
  if (count === 0 && process.env.ADMIN_EMAIL) {
    await Admin.create({
      name: 'Super Admin',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'superadmin',
    });
    console.log(`👤 [Seed] Admin created: ${process.env.ADMIN_EMAIL}`);
  }
};

// ── Start ──────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);

const start = async () => {
  await connectDB();
  await seedAdmin();

  // Verify SMTP (non-blocking)
  verifySmtp().then(({ ok, message }) => {
    console.log(ok ? `✅ [SMTP] ${message}` : `⚠️  [SMTP] ${message}`);
  });

  // Redis ping
  getRedis().ping().then(() => console.log('✅ [Redis] Ping OK'));

  server.listen(PORT, () => {
    console.log(`\n🚀 [Server] Resuming.io Mail Platform running on port ${PORT}`);
    console.log(`   Mode:   ${IS_PROD ? 'production' : 'development'}`);
    console.log(`   API:    http://localhost:${PORT}/api`);
  });
};

start().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

module.exports = { app, server, io };
