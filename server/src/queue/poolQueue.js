/**
 * poolQueue.js — Talent Pool Job Queue
 * ─────────────────────────────────────────────────────────────────
 * Development: Uses SimpleQueue (in-memory, no Redis required)
 * Production:  Uses BullMQ with real Redis (Upstash)
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const POOL_QUEUE_NAME = 'pool-processing';

let poolQueue;

if (IS_PRODUCTION) {
  const { Queue } = require('bullmq');
  const { getRedisClient } = require('../config/redis');
  const connection = getRedisClient();
  poolQueue = new Queue(POOL_QUEUE_NAME, { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } } });
} else {
  const { getQueue } = require('./simpleQueue');
  poolQueue = getQueue(POOL_QUEUE_NAME, { concurrency: 4, maxRetries: 3 });
}

const enqueuePoolResume = async (payload) => {
  const job = await poolQueue.add('process-pool-resume', payload);
  return job.id;
};

const getPoolQueueStats = async () => {
  if (IS_PRODUCTION) {
    const [waiting, active] = await Promise.all([
      poolQueue.getWaitingCount(),
      poolQueue.getActiveCount(),
    ]);
    return { waiting, active };
  }
  const stats = poolQueue.getStats();
  return { waiting: stats.waiting, active: stats.active };
};

module.exports = { poolQueue, enqueuePoolResume, getPoolQueueStats, POOL_QUEUE_NAME };
