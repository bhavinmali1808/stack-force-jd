/**
 * queueFactory.js — Resume Processing Queue (role-specific uploads)
 * ─────────────────────────────────────────────────────────────────
 * Development: Uses SimpleQueue (in-memory, no Redis required)
 * Production:  Uses BullMQ with real Redis (Upstash)
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const QUEUE_NAME = 'resume-processing';

let resumeQueue;

if (IS_PRODUCTION) {
  const { Queue } = require('bullmq');
  const { getRedisClient } = require('../config/redis');
  const connection = getRedisClient();
  resumeQueue = new Queue(QUEUE_NAME, { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } } });
} else {
  const { getQueue } = require('./simpleQueue');
  resumeQueue = getQueue(QUEUE_NAME, { concurrency: 4, maxRetries: 3 });
}

/**
 * Enqueue a resume processing job.
 */
const enqueueResume = async (payload) => {
  const job = await resumeQueue.add('process-resume', payload);
  return job.id;
};

const getQueueStats = async () => {
  if (IS_PRODUCTION) {
    const [waiting, active] = await Promise.all([
      resumeQueue.getWaitingCount(),
      resumeQueue.getActiveCount(),
    ]);
    return { waiting, active };
  }
  const stats = resumeQueue.getStats();
  return { waiting: stats.waiting, active: stats.active };
};

module.exports = { resumeQueue, enqueueResume, getQueueStats, QUEUE_NAME };
