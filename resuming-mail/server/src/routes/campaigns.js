const express  = require('express');
const router   = express.Router();
const { Queue } = require('bullmq');
const Campaign  = require('../models/Campaign');
const EmailLog  = require('../models/EmailLog');
const Template  = require('../models/Template');
const { protect, notViewer } = require('../middleware/auth');
const { resolveAudience }    = require('../services/segmentService');
const { QUEUES, createConnection } = require('../config/redis');
const { withLayout } = require('../services/trackingService');

const emailQueue = new Queue(QUEUES.EMAIL, { connection: createConnection() });

// GET /api/campaigns
router.get('/', protect, async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const filter = status ? { status } : {};
  const [campaigns, total] = await Promise.all([
    Campaign.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit).lean(),
    Campaign.countDocuments(filter),
  ]);
  res.json({ success: true, campaigns, total, page: +page, pages: Math.ceil(total/limit) });
});

// GET /api/campaigns/:id
router.get('/:id', protect, async (req, res) => {
  const campaign = await Campaign.findById(req.params.id).populate('templateId').lean();
  if (!campaign) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, campaign });
});

// POST /api/campaigns — create draft
router.post('/', protect, notViewer, async (req, res) => {
  const campaign = await Campaign.create({ ...req.body, createdBy: req.admin._id, status: 'draft' });
  res.status(201).json({ success: true, campaign });
});

// PUT /api/campaigns/:id — update draft
router.put('/:id', protect, notViewer, async (req, res) => {
  const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, campaign });
});

// DELETE /api/campaigns/:id
router.delete('/:id', protect, notViewer, async (req, res) => {
  await Campaign.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Campaign deleted' });
});

// POST /api/campaigns/:id/send — queue campaign for delivery
router.post('/:id/send', protect, notViewer, async (req, res) => {
  const campaign = await Campaign.findById(req.params.id).populate('templateId');
  if (!campaign) return res.status(404).json({ success: false, message: 'Not found' });
  if (campaign.status === 'sending' || campaign.status === 'sent') {
    return res.status(400).json({ success: false, message: `Campaign is already ${campaign.status}` });
  }

  // Resolve audience
  console.log("================================");
console.log("CAMPAIGN:", campaign);
console.log("AUDIENCE TYPE:", campaign.audienceType);

const contacts = await resolveAudience(campaign.audienceType);

console.log("CONTACTS FOUND:", contacts.length);
console.log(contacts);
console.log("================================");  if (contacts.length === 0) {
    return res.status(400).json({ success: false, message: 'No eligible contacts in audience' });
  }

  // Build HTML
  const template = campaign.templateId;
  const baseHtml = template?.html || campaign.html || '<p>No content</p>';
  const html = withLayout(baseHtml, { previewText: campaign.previewText });

  // Update campaign to queued
  campaign.status = 'queued';
  campaign.stats.total = contacts.length;
  campaign.stats.queued = contacts.length;
  campaign.startedAt = new Date();
  await campaign.save();

  // Create EmailLog entries + add BullMQ jobs in batches
  const BATCH = 500;
  let jobId = null;
  for (let i = 0; i < contacts.length; i += BATCH) {
    const batch = contacts.slice(i, i + BATCH);
    const logs = await EmailLog.insertMany(
      batch.map(c => ({
        campaign: campaign._id,
        recipientEmail: c.email,
        recipientName: c.firstName ? `${c.firstName} ${c.lastName || ''}`.trim() : '',
        variables: {
          first_name: c.firstName || '',
          last_name:  c.lastName || '',
          email:      c.email,
          plan:       c.plan || 'free',
          resume_score: c.resumeScore || 0,
          resume_title: c.resumeTitle || '',
        },
        status: 'queued',
      }))
    );

    const jobs = logs.map(log => ({
      name: 'send-email',
      data: {
        campaignId:     String(campaign._id),
        logId:          String(log._id),
        recipientEmail: log.recipientEmail,
        recipientName:  log.recipientName,
        variables:      log.variables,
        subject:        campaign.subject,
        html,
        senderName:     campaign.senderName,
        senderEmail:    campaign.senderEmail,
        replyTo:        campaign.replyTo,
      },
      opts: {
        attempts:  3,
        backoff:   { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail:     { count: 5000 },
      },
    }));

    const added = await emailQueue.addBulk(jobs);
     console.log("================================");
console.log("BULL JOBS ADDED:", added.length);
console.log("FIRST JOB ID:", added[0]?.id);
console.log("================================");
    if (i === 0) jobId = String(added[0]?.id);
  }

  campaign.status = 'sending';
  campaign.jobId = jobId;
  await campaign.save();

  // Emit real-time event
  req.app.get('io')?.to('dashboard').emit('campaign:started', {
    campaignId: campaign._id,
    name: campaign.name,
    total: contacts.length,
  });

  res.json({ success: true, message: `Campaign queued — ${contacts.length} emails`, campaign });
});

// POST /api/campaigns/:id/test — send test to one email
router.post('/:id/test', protect, async (req, res) => {
  const { email } = req.body;
  const campaign = await Campaign.findById(req.params.id).populate('templateId');
  if (!campaign) return res.status(404).json({ success: false, message: 'Not found' });

  const { sendEmail } = require('../services/smtpService');
  const { withLayout } = require('../services/trackingService');
  const baseHtml = campaign.templateId?.html || '<p>Test email</p>';
  const html = withLayout(baseHtml, { previewText: campaign.previewText });

  await sendEmail({
    to: email, toName: 'Test Recipient',
    from: campaign.senderEmail, fromName: campaign.senderName,
    subject: `[TEST] ${campaign.subject}`,
    html,
  });

  res.json({ success: true, message: `Test sent to ${email}` });
});

// POST /api/campaigns/:id/pause
router.post('/:id/pause', protect, notViewer, async (req, res) => {
  await emailQueue.pause();
  await Campaign.findByIdAndUpdate(req.params.id, { status: 'paused' });
  res.json({ success: true, message: 'Campaign paused (queue paused)' });
});

// POST /api/campaigns/:id/resume
router.post('/:id/resume', protect, notViewer, async (req, res) => {
  await emailQueue.resume();
  await Campaign.findByIdAndUpdate(req.params.id, { status: 'sending' });
  res.json({ success: true, message: 'Campaign resumed' });
});

// POST /api/campaigns/:id/duplicate
router.post('/:id/duplicate', protect, notViewer, async (req, res) => {
  const original = await Campaign.findById(req.params.id).lean();
  if (!original) return res.status(404).json({ success: false, message: 'Not found' });
  const { _id, createdAt, updatedAt, stats, status, jobId, startedAt, completedAt, ...rest } = original;
  const copy = await Campaign.create({ ...rest, name: `${rest.name} (Copy)`, status: 'draft', createdBy: req.admin._id });
  res.status(201).json({ success: true, campaign: copy });
});

module.exports = router;
