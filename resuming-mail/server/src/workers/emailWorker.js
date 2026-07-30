/**
 * emailWorker.js — BullMQ Email Delivery Worker
 * ───────────────────────────────────────────────
 * Consumes jobs from the `resuming:email` queue.
 * Each job = one email to one recipient.
 *
 * Features:
 * - Configurable concurrency (EMAIL_CONCURRENCY env)
 * - Rate limiting via Nodemailer pool (EMAIL_RATE/sec)
 * - Exponential backoff retry × 3
 * - Hard bounce → BounceList + SuppressionList auto-add
 * - Soft bounce → retry up to 3× then suppress
 * - Emits Socket.io events for real-time dashboard
 * - Campaign stats incremented atomically
 */

require('dotenv').config();
const { Worker, QueueEvents } = require('bullmq');
const { createConnection, QUEUES } = require('../config/redis');
const { sendEmail, classifyError } = require('../services/smtpService');
const { prepareEmail, generateTrackingId } = require('../services/trackingService');
const { connectDB } = require('../config/db');

// Models (lazy require — worker runs in separate process)
let EmailLog, Campaign, BounceList, SuppressionList;
const loadModels = () => {
  EmailLog       = require('../models/EmailLog');
  Campaign       = require('../models/Campaign');
  BounceList     = require('../models/BounceList');
  SuppressionList = require('../models/SuppressionList');
};

const CONCURRENCY = parseInt(process.env.EMAIL_CONCURRENCY || '5', 10);

// ── Worker process function ───────────────────────────────────

const processJob = async (job) => {
  const {
    campaignId,
    recipientEmail,
    recipientName,
    subject,
    html,
    senderName,
    senderEmail,
    replyTo,
    variables = {},
    logId,
  } = job.data;

  let log;

  try {
    // Get or create the EmailLog entry
    log = await EmailLog.findById(logId);
    if (!log) {
      log = new EmailLog({
        campaign: campaignId,
        recipientEmail,
        recipientName,
        variables,
        status: 'sending',
        jobId: String(job.id),
      });
    } else {
      log.status = 'sending';
      log.attempts = (log.attempts || 0) + 1;
    }

    // Generate tracking ID
    const trackingId = log.trackingId || generateTrackingId();
    log.trackingId = trackingId;

    // Prepare HTML with tracking + variables
    const processedHtml = prepareEmail(html, {
      ...variables,
      unsubscribe_link: `${process.env.TRACKING_BASE_URL}/unsubscribe/${trackingId}`,
    }, trackingId);

    // Send via Nodemailer → Postfix
    const result = await sendEmail({
      to:       recipientEmail,
      toName:   recipientName,
      from:     senderEmail,
      fromName: senderName,
      replyTo,
      subject,
      html:     processedHtml,
    });

    // Mark delivered
    log.status    = 'delivered';
    log.messageId = result.messageId;
    log.sentAt    = new Date();
    log.deliveredAt = new Date();
    await log.save();

    // Increment campaign stats
    await Campaign.findByIdAndUpdate(campaignId, {
      $inc: { 'stats.sent': 1, 'stats.delivered': 1 },
    });

    return { success: true, messageId: result.messageId };

  } catch (err) {
    const bounceType = classifyError(err);
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts || 3) - 1;

    if (log) {
      log.status      = isLastAttempt ? 'failed' : 'sending';
      log.error       = err.message;
      log.bounceType  = bounceType === 'hard' ? 'hard' : '';
      await log.save();
    }

    // Hard bounce: suppress immediately
    if (bounceType === 'hard') {
      await Promise.allSettled([
        BounceList.findOneAndUpdate(
          { email: recipientEmail },
          { email: recipientEmail, bounceType: 'hard', campaign: campaignId, reason: err.message },
          { upsert: true, new: true }
        ),
        SuppressionList.findOneAndUpdate(
          { email: recipientEmail },
          { email: recipientEmail, reason: 'bounce', campaign: campaignId },
          { upsert: true, new: true }
        ),
      ]);
      await Campaign.findByIdAndUpdate(campaignId, { $inc: { 'stats.bounced': 1 } });
      // Don't retry hard bounces
      return { success: false, bounceType: 'hard', email: recipientEmail };
    }

    // Soft bounce: let BullMQ retry
    if (isLastAttempt) {
      await Campaign.findByIdAndUpdate(campaignId, {
        $inc: { 'stats.failed': 1, 'stats.softBounced': 1 },
      });
    }

    throw err; // re-throw so BullMQ schedules retry
  }
};

// ── Start Worker ──────────────────────────────────────────────

const startWorker = async () => {
  await connectDB();
  loadModels();

  const worker = new Worker(
    QUEUES.EMAIL,
    processJob,
    {
      connection: createConnection(),
      concurrency: CONCURRENCY,
      limiter: {
        max:      parseInt(process.env.EMAIL_RATE || '10', 10),
        duration: 1000, // per second
      },
    }
  );

  worker.on('completed', (job, result) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ [Worker] Job ${job.id} completed → ${job.data.recipientEmail}`);
    }
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ [Worker] Job ${job.id} failed (attempt ${job.attemptsMade}): ${err.message}`);
  });

  worker.on('error', (err) => {
    console.error('❌ [Worker] Error:', err.message);
  });

  console.log(`🚀 [Worker] Email worker started — concurrency: ${CONCURRENCY}, rate: ${process.env.EMAIL_RATE || 10}/sec`);
  return worker;
};

// If run directly (separate process)
if (require.main === module) {
  startWorker().catch(console.error);
}

module.exports = { startWorker };
