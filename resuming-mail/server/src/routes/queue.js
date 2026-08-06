const express  = require('express');
const router   = express.Router();
const { Queue, QueueEvents } = require('bullmq');
const { protect, superAdminOnly } = require('../middleware/auth');
const { QUEUES, createConnection } = require('../config/redis');

const emailQueue = new Queue(QUEUES.EMAIL, { connection: createConnection() });

// GET /api/queue/status
router.get('/status', protect, async (req, res) => {
  try {
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
  } catch (err) {
    console.error('[Queue Status Error]:', err.message);
    res.json({
      success: true,
      queue: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, isPaused: false, total: 0, redisError: err.message },
    });
  }
});

// GET /api/queue/failed — list failed jobs
router.get('/failed', protect, async (req, res) => {
  try {
    const jobs = await emailQueue.getFailed(0, 49);
    const data = jobs.map(j => ({
      id: j.id,
      data: j.data,
      failedReason: j.failedReason,
      attemptsMade: j.attemptsMade,
      processedOn:  j.processedOn,
    }));
    res.json({ success: true, jobs: data });
  } catch (err) {
    console.error('[Queue Failed Jobs Error]:', err.message);
    res.json({ success: true, jobs: [] });
  }
});

// POST /api/queue/retry-all — retry all failed jobs
router.post('/retry-all', protect, superAdminOnly, async (req, res) => {
  try {
    const failed = await emailQueue.getFailed(0, 999);
    await Promise.allSettled(failed.map(j => j.retry()));
    res.json({ success: true, message: `Retried ${failed.length} failed jobs` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to retry jobs' });
  }
});

// POST /api/queue/retry/:jobId
router.post('/retry/:jobId', protect, superAdminOnly, async (req, res) => {
  try {
    const job = await emailQueue.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    await job.retry();
    res.json({ success: true, message: `Job ${req.params.jobId} retried` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to retry job' });
  }
});

// POST /api/queue/pause
router.post('/pause', protect, superAdminOnly, async (req, res) => {
  try {
    await emailQueue.pause();
    res.json({ success: true, message: 'Queue paused' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to pause queue' });
  }
});

// POST /api/queue/resume
router.post('/resume', protect, superAdminOnly, async (req, res) => {
  try {
    await emailQueue.resume();
    res.json({ success: true, message: 'Queue resumed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to resume queue' });
  }
});

// DELETE /api/queue/drain — remove all waiting jobs
router.delete('/drain', protect, superAdminOnly, async (req, res) => {
  try {
    await emailQueue.drain();
    res.json({ success: true, message: 'Queue drained' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to drain queue' });
  }
});

// DELETE /api/queue/clean — clean completed jobs older than 1h
router.delete('/clean', protect, superAdminOnly, async (req, res) => {
  try {
    const removed = await emailQueue.clean(3600000, 100, 'completed');
    res.json({ success: true, message: `Cleaned ${removed.length} completed jobs` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to clean queue' });
  }
});

module.exports = router;
