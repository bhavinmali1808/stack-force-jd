require('dotenv').config();
require('express-async-errors');

const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server: SocketIO } = require('socket.io');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const roleRoutes = require('./routes/role.routes');
const candidateRoutes = require('./routes/candidate.routes');
const emailRoutes = require('./routes/email.routes');
const storageRoutes = require('./routes/storage.routes');
const queueRoutes = require('./routes/queue.routes');
const poolRoutes = require('./routes/pool.routes');
const { errorHandler } = require('./middleware/error.middleware');
const { startPoolWorker } = require('./workers/poolWorkerInline');
const { startResumeWorker } = require('./workers/resumeWorkerInline');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const app = express();

// ── Security ───────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false, // needed for pdf preview
  contentSecurityPolicy: IS_PRODUCTION ? undefined : false,
}));

// Trust Cloudflare/Railway proxy headers
app.set('trust proxy', 1);

// ── Logging ─────────────────────────────────────────────────
app.use(morgan(IS_PRODUCTION ? 'combined' : 'dev'));

// ── CORS ────────────────────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile, curl, health checks)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// ── Rate Limiting ──────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50000, // Increased to 50,000 to safely allow 5,000+ resume bulk uploads
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // max 20 login/register attempts per 15 min
  message: { error: 'Too many auth attempts, please try again later.' },
});

app.use(globalLimiter);

app.use(express.json({ limit: '10mb' }));

// Serve uploaded resumes statically (dev only - production uses R2)
if (!IS_PRODUCTION) {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// ── HTTP Server + Socket.io ────────────────────────────────
const server = http.createServer(app);
const io = new SocketIO(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
  // In production with multiple instances, use Redis adapter
  adapter: undefined, // set below after Redis connects
});

// ── Socket.io Redis Adapter (production multi-instance scaling) ──
if (IS_PRODUCTION) {
  try {
    const { createAdapter } = require('@socket.io/redis-adapter');
    const Redis = require('ioredis');
    const pubClient = new Redis(process.env.REDIS_URL, {
      tls: process.env.REDIS_URL?.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('🔴 [Socket.io] Redis adapter enabled (multi-instance ready)');
  } catch (err) {
    console.warn('⚠️  [Socket.io] Redis adapter failed, using in-memory:', err.message);
  }
}

// Attach io to app so routes can access it via req.app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
  socket.on('join-role', (roleId) => {
    socket.join(`role:${roleId}`);
  });
  socket.on('join-company', (companyId) => {
    socket.join(`company:${companyId}`);
  });
  socket.on('disconnect', () => {
    if (!IS_PRODUCTION) {
      console.log(`🔌 [Socket] Client ${socket.id} disconnected`);
    }
  });
});

// ── Internal endpoints: Worker → API → Browser ─────────────
app.post('/internal/pool-job-done', express.json(), (req, res) => {
  const { poolResumeId, companyId, name, skillCount } = req.body;
  io.to(`company:${companyId}`).emit('pool:resume-processed', {
    poolResumeId, name, skillCount, timestamp: new Date().toISOString(),
  });
  res.sendStatus(200);
});

app.post('/internal/job-done', express.json(), (req, res) => {
  const { candidateId, roleId, score, name } = req.body;
  if (roleId) {
    io.to(`role:${roleId}`).emit('candidate:processed', {
      candidateId, score, name, timestamp: new Date().toISOString(),
    });
  }
  res.sendStatus(200);
});

// ── Public Routes ──────────────────────────────────────────
app.get('/', (req, res) => res.json({
  name: 'TalentForce JD API',
  version: '1.0.0',
  status: 'ok',
  environment: IS_PRODUCTION ? 'production' : 'development',
}));

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  architecture: 'event-driven (BullMQ + Socket.io)',
  environment: IS_PRODUCTION ? 'production' : 'development',
  timestamp: new Date(),
}));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', roleRoutes);
app.use('/api', candidateRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/pool', poolRoutes);
app.use('/api', poolRoutes); // /api/roles/:id/suggestions + suggest-add

// ── Error Handler ──────────────────────────────────────────
app.use(errorHandler);

// ── Graceful Shutdown ──────────────────────────────────────
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 [Server] ${signal} received — shutting down gracefully...`);
  server.close(() => {
    console.log('✅ [Server] HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('⚠️  [Server] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ── Boot ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  startResumeWorker(io);
  startPoolWorker(io);

  server.listen(PORT, () => {
    console.log(`\n🚀 TalentForce JD API   → http://localhost:${PORT}`);
    console.log(`📡 Socket.io            → ws://localhost:${PORT}`);
    console.log(`📊 Queue Status         → http://localhost:${PORT}/api/queue/status`);
    console.log(`🗄️  Talent Pool          → http://localhost:${PORT}/api/pool`);
    if (!IS_PRODUCTION) {
      console.log(`🐍 Python Parser        → http://localhost:8000 (optional, Node.js fallback active)\n`);
    }
  });
});
