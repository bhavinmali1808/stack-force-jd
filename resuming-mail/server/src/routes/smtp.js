const express = require('express');
const router  = express.Router();
const os      = require('os');
const { getRedis, QUEUES, createConnection } = require('../config/redis');
const { verifySmtp }  = require('../config/smtp');
const { protect }     = require('../middleware/auth');
const { Queue }       = require('bullmq');

const emailQueue = new Queue(QUEUES.EMAIL, { connection: createConnection() });

// GET /api/smtp/status
router.get('/status', protect, async (req, res) => {
  const smtp = await verifySmtp();

  // Queue depth
  const [waiting, active, failed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getFailedCount(),
  ]);

  // Redis ping
  let redisOk = false;
  try { await getRedis().ping(); redisOk = true; } catch {}

  // System metrics
  const cpuLoad = os.loadavg()[0];
  const totalMem = os.totalmem();
  const freeMem  = os.freemem();
  const memUsedPct = (((totalMem - freeMem) / totalMem) * 100).toFixed(1);

  res.json({
    success: true,
    status: {
      smtp:  { ok: smtp.ok, message: smtp.message },
      redis: { ok: redisOk },
      queue: { waiting, active, failed },
      system: {
        cpu:    cpuLoad.toFixed(2),
        memUsed: memUsedPct,
        uptime: Math.floor(process.uptime()),
        nodeVersion: process.version,
      },
    },
  });
});

// GET /api/smtp/test — detailed SMTP test
router.get('/test', protect, async (req, res) => {
  const { ok, message } = await verifySmtp();
  res.json({ success: ok, message, timestamp: new Date() });
});

module.exports = router;
