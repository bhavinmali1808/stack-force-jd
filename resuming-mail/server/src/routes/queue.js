const express  = require('express');
const router   = express.Router();
const { Queue, QueueEvents } = require('bullmq');
const { protect, superAdminOnly } = require('../middleware/auth');
const { QUEUES, createConnection } = require('../config/redis');

const emailQueue = new Queue(QUEUES.EMAIL, { connection: createConnection() });

// GET /api/queue/status
router.get('/status', protect, async (req, res) => {
  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
    emailQueue.isPaused(),
  ]);

  res.json({
    success: true,
    queue: { waiting, active, completed, failed, delayed, isPaused: paused, total: waiting + active + delayed },
  });
});

// GET /api/queue/failed — list failed jobs
router.get('/failed', protect, async (req, res) => {
  const jobs = await emailQueue.getFailed(0, 49);
  const data = jobs.map(j => ({
    id: j.id,
    data: j.data,
    failedReason: j.failedReason,
    attemptsMade: j.attemptsMade,
    processedOn:  j.processedOn,
  }));
  res.json({ success: true, jobs: data });
});

// POST /api/queue/retry-all — retry all failed jobs
router.post('/retry-all', protect, superAdminOnly, async (req, res) => {
  const failed = await emailQueue.getFailed(0, 999);
  await Promise.allSettled(failed.map(j => j.retry()));
  res.json({ success: true, message: `Retried ${failed.length} failed jobs` });
});

// POST /api/queue/retry/:jobId
router.post('/retry/:jobId', protect, superAdminOnly, async (req, res) => {
  const job = await emailQueue.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  await job.retry();
  res.json({ success: true, message: `Job ${req.params.jobId} retried` });
});

// POST /api/queue/pause
router.post('/pause', protect, superAdminOnly, async (req, res) => {
  await emailQueue.pause();
  res.json({ success: true, message: 'Queue paused' });
});

// POST /api/queue/resume
router.post('/resume', protect, superAdminOnly, async (req, res) => {
  await emailQueue.resume();
  res.json({ success: true, message: 'Queue resumed' });
});

// DELETE /api/queue/drain — remove all waiting jobs
router.delete('/drain', protect, superAdminOnly, async (req, res) => {
  await emailQueue.drain();
  res.json({ success: true, message: 'Queue drained' });
});

// DELETE /api/queue/clean — clean completed jobs older than 1h
router.delete('/clean', protect, superAdminOnly, async (req, res) => {
  const removed = await emailQueue.clean(3600000, 100, 'completed');
  res.json({ success: true, message: `Cleaned ${removed.length} completed jobs` });
});

module.exports = router;
