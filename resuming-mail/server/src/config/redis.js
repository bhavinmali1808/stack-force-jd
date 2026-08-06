const { Queue, Worker, QueueEvents } = require('bullmq');
const IORedis = require('ioredis');

const getRedisConfig = () => {
  if (process.env.REDIS_URL) {
    const isTls = process.env.REDIS_URL.startsWith('rediss://');
    return {
      url: process.env.REDIS_URL,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: isTls ? { rejectUnauthorized: false } : undefined,
    };
  }

  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;
  const username = process.env.REDIS_USERNAME || undefined;

  return {
    host,
    port,
    username,
    password,
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
  };
};

// Connection factory for BullMQ queues and workers
const createConnection = () => {
  if (process.env.REDIS_URL) {
    const isTls = process.env.REDIS_URL.startsWith('rediss://');
    return new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: isTls ? { rejectUnauthorized: false } : undefined,
    });
  }
  return new IORedis(getRedisConfig());
};

// Singleton for general use (health checks etc.)
let _redis;
const getRedis = () => {
  if (!_redis) {
    _redis = createConnection();
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

const redisConfig = getRedisConfig();

module.exports = { redisConfig, createConnection, getRedis, QUEUES };
