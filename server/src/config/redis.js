/**
 * redisClient.js — Shared Redis connection for production
 * ─────────────────────────────────────────────────────────────
 * In development: no Redis needed (uses SimpleQueue + in-process)
 * In production:  connects to Upstash Redis via REDIS_URL
 *
 * Used by:
 *  - BullMQ (queue backend)
 *  - Socket.io Redis adapter (pub/sub across API instances)
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let redisClient = null;

function getRedisClient() {
  if (!IS_PRODUCTION) return null;
  if (redisClient) return redisClient;

  const Redis = require('ioredis');
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  });

  redisClient.on('connect', () => console.log('🔴 [Redis] Connected'));
  redisClient.on('error', (err) => console.error('🔴 [Redis] Error:', err.message));

  return redisClient;
}

module.exports = { getRedisClient, IS_PRODUCTION };
