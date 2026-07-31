const { Queue, Worker, QueueEvents } = require('bullmq');
const IORedis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
};

// Connection for BullMQ queues
const createConnection = () => new IORedis(redisConfig);

// Singleton for general use (health checks etc.)
let _redis;
const getRedis = () => {
  if (!_redis) {
    _redis = new IORedis(redisConfig);
    _redis.on('connect', () => console.log('✅ [Redis] Connected'));
    _redis.on('error', (e) => console.error('❌ [Redis]', e.message));
  }
  return _redis;
};

// ── Queue Names ───────────────────────────────
const QUEUES = {
  EMAIL: 'resuming-email',
  SCHEDULE: 'resuming-schedule',
};

module.exports = { redisConfig, createConnection, getRedis, QUEUES };
