/**
 * Emailer Routes — /api/emailer
 * ─────────────────────────────
 * Full email microservice API:
 *  GET  /contacts          — All job-hunter contacts for this company
 *  GET  /quota             — Daily send quota
 *  POST /send              — Send single or bulk email (direct)
 *  GET  /templates         — List email templates
 *  POST /templates         — Create custom template
 *  PUT  /templates/:id     — Update template
 *  DELETE /templates/:id   — Delete template
 *  GET  /campaigns         — List all campaigns
 *  POST /campaigns         — Create & send campaign
 *  GET  /campaigns/:id     — Campaign details + per-recipient log
 *  GET  /logs              — Email send history with filters
 *  GET  /analytics         — Aggregate stats (sent, opened, failed, by category)
 *  POST /unsubscribe       — Handle unsubscribe requests
 *  GET  /unsubscribe       — Unsubscribe link handler (GET for email clients)
 *  POST /send-otp          — Internal: send OTP (for auth service use)
 *  GET  /smtp-health       — Check SMTP server connectivity
 */

const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const Candidate = require('../models/Candidate');
const PoolResume = require('../models/PoolResume');
const EmailQuota = require('../models/EmailQuota');
const EmailTemplate = require('../models/EmailTemplate');
const EmailLog = require('../models/EmailLog');
const EmailCampaign = require('../models/EmailCampaign');
const {
  sendEmail,
  sendOTP,
  sendBulk,
  renderTemplate,
  wrapInEmailLayout,
  generateUnsubscribeToken,
  verifyConnection,
} = require('../services/emailService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getTodayString = () => new Date().toISOString().split('T')[0];

const DEFAULT_DAILY_LIMIT = parseInt(process.env.EMAIL_DAILY_LIMIT || '10', 10);

const getOrCreateQuota = async (userId) => {
  const today = getTodayString();
  let quota = await EmailQuota.findOne({ user: userId, date: today });
  if (!quota) {
    quota = await EmailQuota.create({
      user: userId,
      date: today,
      sentCount: 0,
      dailyLimit: DEFAULT_DAILY_LIMIT,
    });
  }
  return quota;
};

// ─── Default System Templates (shown to all users) ───────────────────────────

const DEFAULT_TEMPLATES = [
  {
    _id: 'sys-welcome',
    name: 'Welcome Email',
    category: 'welcome',
    isSystem: true,
    subject: 'Welcome to {{company}} Talent Network! 🎉',
    bodyHtml: `<h1>Welcome, {{name}}! 🚀</h1>
<p>Your account at <strong>{{company}}</strong> is now active.</p>
<p>We're excited to have you on board. Start exploring opportunities today.</p>
<a href="{{loginUrl}}" class="btn">Get Started →</a>`,
  },
  {
    _id: 'sys-otp',
    name: 'OTP / Password Reset',
    category: 'otp',
    isSystem: true,
    subject: '{{otp}} — Your verification code for {{company}}',
    bodyHtml: `<h1>Verify your identity</h1>
<p>Hi <strong>{{name}}</strong>, your one-time code is:</p>
<div class="otp-box"><div class="otp-code">{{otp}}</div><div class="otp-expiry">Expires in 10 minutes</div></div>
<p>Do not share this code with anyone.</p>`,
  },
  {
    _id: 'sys-outreach',
    name: 'Job Outreach',
    category: 'outreach',
    isSystem: true,
    subject: 'Exciting opportunity: {{jobTitle}} at {{company}}',
    bodyHtml: `<h1>We found a role for you 👋</h1>
<p>Hi <strong>{{name}}</strong>,</p>
<p>I came across your profile and believe you'd be a great fit for the <strong>{{jobTitle}}</strong> position at <strong>{{company}}</strong>.</p>
<p>{{jobDescription}}</p>
<a href="{{applyUrl}}" class="btn">View & Apply →</a>
<p>Best regards,<br/><strong>{{recruiterName}}</strong><br/>{{company}}</p>`,
  },
  {
    _id: 'sys-interview',
    name: 'Interview Invitation',
    category: 'interview',
    isSystem: true,
    subject: 'Interview Invitation: {{jobTitle}} at {{company}}',
    bodyHtml: `<h1>You're invited for an interview! 🎯</h1>
<p>Hi <strong>{{name}}</strong>,</p>
<p>We'd like to invite you to interview for <strong>{{jobTitle}}</strong> at <strong>{{company}}</strong>.</p>
<div class="info-card">
  <strong>📅 Date:</strong> {{interviewDate}}<br/>
  <strong>🕐 Time:</strong> {{interviewTime}}<br/>
  <strong>👤 With:</strong> {{recruiterName}}
</div>
<a href="{{interviewLink}}" class="btn">Join Interview →</a>
<p>Please confirm by replying to this email.</p>`,
  },
  {
    _id: 'sys-newsletter',
    name: 'Company Newsletter',
    category: 'marketing',
    isSystem: true,
    subject: '{{company}} — {{month}} Hiring Update',
    bodyHtml: `<h1>{{company}} — Hiring Update</h1>
<p>Hi <strong>{{name}}</strong>,</p>
<p>Here's what's new at <strong>{{company}}</strong> this month.</p>
<p>{{content}}</p>
<a href="{{ctaUrl}}" class="btn">{{ctaText}}</a>`,
  },
];

// ─── GET /api/emailer/contacts ────────────────────────────────────────────────

router.get('/contacts', protect, async (req, res) => {
  try {
    const companyId = req.user._id;
    const { search, skill, source } = req.query;

    const [candidates, pool] = await Promise.all([
      Candidate.find({ company: companyId })
        .select('name email phone college yearsOfExperience extractedSkills createdAt')
        .lean(),
      PoolResume.find({ company: companyId, processingStatus: 'done' })
        .select('name email phone college yearsOfExperience extractedSkills createdAt')
        .lean(),
    ]);

    const contactMap = new Map();

    const addContact = (item, src) => {
      if (!item.email) return;
      const key = item.email.toLowerCase();
      if (!contactMap.has(key)) {
        contactMap.set(key, {
          id: item._id,
          name: item.name || 'Candidate',
          email: item.email,
          phone: item.phone || '',
          college: item.college || '',
          experience: item.yearsOfExperience ? `${item.yearsOfExperience} yrs` : 'N/A',
          skills: item.extractedSkills || [],
          source: src,
        });
      }
    };

    candidates.forEach((c) => addContact(c, 'Job Applicant'));
    pool.forEach((p) => addContact(p, 'Talent Pool'));

    let contacts = Array.from(contactMap.values());

    // Apply filters
    if (search) {
      const q = search.toLowerCase();
      contacts = contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.college?.toLowerCase().includes(q)
      );
    }
    if (skill) {
      const skillLower = skill.toLowerCase();
      contacts = contacts.filter((c) =>
        c.skills.some((s) => s.toLowerCase().includes(skillLower))
      );
    }
    if (source) {
      contacts = contacts.filter((c) => c.source === source);
    }

    res.json({ success: true, count: contacts.length, contacts });
  } catch (err) {
    console.error('[Emailer] Get contacts error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch contacts' });
  }
});

// ─── GET /api/emailer/quota ───────────────────────────────────────────────────

router.get('/quota', protect, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'superadmin';
    const quota = await getOrCreateQuota(req.user._id);
    const remaining = isSuperAdmin ? 999999 : Math.max(0, quota.dailyLimit - quota.sentCount);

    res.json({
      success: true,
      sentCount: quota.sentCount,
      dailyLimit: isSuperAdmin ? 'Unlimited' : quota.dailyLimit,
      remaining,
      date: getTodayString(),
    });
  } catch (err) {
    console.error('[Emailer] Get quota error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch quota' });
  }
});

// ─── POST /api/emailer/send ───────────────────────────────────────────────────

router.post('/send', protect, async (req, res) => {
  try {
    const { recipients, subject, bodyHtml, category = 'outreach' } = req.body;
    const isSuperAdmin = req.user.role === 'superadmin';

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one recipient is required' });
    }
    if (!subject || !bodyHtml) {
      return res.status(400).json({ success: false, message: 'Subject and email body are required' });
    }

    const quota = await getOrCreateQuota(req.user._id);
    if (!isSuperAdmin && quota.sentCount + recipients.length > quota.dailyLimit) {
      const remaining = Math.max(0, quota.dailyLimit - quota.sentCount);
      return res.status(429).json({
        success: false,
        message: `Daily limit exceeded! You have ${remaining} emails remaining today (Limit: ${quota.dailyLimit}/day).`,
        remaining,
      });
    }

    const senderCtx = { company: req.user.name || 'StackForce', recruiterName: req.user.name || 'Hiring Team' };
    const normalizedRecipients = recipients.map((r) =>
      typeof r === 'string' ? { email: r } : r
    );

    const { results, successCount } = await sendBulk(
      normalizedRecipients,
      { subject, bodyHtml, category },
      senderCtx,
      null
    );

    // Log all results to DB
    await Promise.allSettled(
      results.map((r) =>
        EmailLog.create({
          sender: req.user._id,
          recipientEmail: r.email,
          subject: renderTemplate(subject, { ...senderCtx, name: r.name || '' }),
          status: r.status,
          error: r.error || '',
          category,
          messageId: r.messageId || '',
        })
      )
    );

    // Update quota
    quota.sentCount += successCount;
    await quota.save();

    res.json({
      success: true,
      message: `Processed ${results.length} email(s) — ${successCount} sent`,
      successCount,
      failedCount: results.length - successCount,
      quotaRemaining: isSuperAdmin ? 'Unlimited' : Math.max(0, quota.dailyLimit - quota.sentCount),
      results,
    });
  } catch (err) {
    console.error('[Emailer] Send error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to send emails' });
  }
});

// ─── GET /api/emailer/templates ──────────────────────────────────────────────

router.get('/templates', protect, async (req, res) => {
  try {
    const customTemplates = await EmailTemplate.find({ company: req.user._id }).lean();
    const templates = [
      ...DEFAULT_TEMPLATES,
      ...customTemplates.map((t) => ({ ...t, isSystem: false })),
    ];
    res.json({ success: true, count: templates.length, templates });
  } catch (err) {
    console.error('[Emailer] Get templates error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch templates' });
  }
});

// ─── POST /api/emailer/templates ─────────────────────────────────────────────

router.post('/templates', protect, async (req, res) => {
  try {
    const { name, subject, bodyHtml, category = 'custom' } = req.body;
    if (!name || !subject || !bodyHtml) {
      return res.status(400).json({ success: false, message: 'name, subject, and bodyHtml are required' });
    }
    const template = await EmailTemplate.create({
      company: req.user._id,
      name,
      subject,
      bodyHtml,
      category,
    });
    res.status(201).json({ success: true, template });
  } catch (err) {
    console.error('[Emailer] Create template error:', err);
    res.status(500).json({ success: false, message: 'Failed to create template' });
  }
});

// ─── PUT /api/emailer/templates/:id ──────────────────────────────────────────

router.put('/templates/:id', protect, async (req, res) => {
  try {
    const template = await EmailTemplate.findOneAndUpdate(
      { _id: req.params.id, company: req.user._id },
      req.body,
      { new: true }
    );
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, template });
  } catch (err) {
    console.error('[Emailer] Update template error:', err);
    res.status(500).json({ success: false, message: 'Failed to update template' });
  }
});

// ─── DELETE /api/emailer/templates/:id ───────────────────────────────────────

router.delete('/templates/:id', protect, async (req, res) => {
  try {
    const template = await EmailTemplate.findOneAndDelete({
      _id: req.params.id,
      company: req.user._id,
    });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    console.error('[Emailer] Delete template error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete template' });
  }
});

// ─── GET /api/emailer/campaigns ──────────────────────────────────────────────

router.get('/campaigns', protect, async (req, res) => {
  try {
    const campaigns = await EmailCampaign.find({ company: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, count: campaigns.length, campaigns });
  } catch (err) {
    console.error('[Emailer] Get campaigns error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch campaigns' });
  }
});

// ─── POST /api/emailer/campaigns ─────────────────────────────────────────────

router.post('/campaigns', protect, async (req, res) => {
  try {
    const { name, subject, bodyHtml, category = 'marketing', recipients } = req.body;

    if (!name || !subject || !bodyHtml) {
      return res.status(400).json({ success: false, message: 'name, subject, and bodyHtml are required' });
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one recipient required' });
    }

    const isSuperAdmin = req.user.role === 'superadmin';
    const quota = await getOrCreateQuota(req.user._id);
    if (!isSuperAdmin && quota.sentCount + recipients.length > quota.dailyLimit) {
      return res.status(429).json({
        success: false,
        message: `Daily limit exceeded. ${Math.max(0, quota.dailyLimit - quota.sentCount)} emails remaining today.`,
      });
    }

    // Create campaign in DB
    const campaign = await EmailCampaign.create({
      company: req.user._id,
      name,
      subject,
      bodyHtml,
      category,
      status: 'sending',
      recipientCount: recipients.length,
    });

    const senderCtx = { company: req.user.name || 'StackForce', recruiterName: req.user.name || 'Hiring Team' };
    const { results, successCount, failedCount } = await sendBulk(
      recipients,
      { subject, bodyHtml, category },
      senderCtx,
      null
    );

    // Log results
    await Promise.allSettled(
      results.map((r) =>
        EmailLog.create({
          sender: req.user._id,
          campaign: campaign._id,
          recipientEmail: r.email,
          recipientName: r.name || '',
          subject: renderTemplate(subject, { ...senderCtx, name: r.name || '' }),
          status: r.status,
          error: r.error || '',
          category,
          messageId: r.messageId || '',
        })
      )
    );

    // Update campaign stats
    campaign.status = failedCount === recipients.length ? 'failed' : 'sent';
    campaign.sentCount = successCount;
    campaign.failedCount = failedCount;
    campaign.sentAt = new Date();
    await campaign.save();

    // Update quota
    quota.sentCount += successCount;
    await quota.save();

    res.status(201).json({
      success: true,
      campaign,
      results: { total: recipients.length, sent: successCount, failed: failedCount },
    });
  } catch (err) {
    console.error('[Emailer] Create campaign error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to run campaign' });
  }
});

// ─── GET /api/emailer/campaigns/:id ──────────────────────────────────────────

router.get('/campaigns/:id', protect, async (req, res) => {
  try {
    const campaign = await EmailCampaign.findOne({
      _id: req.params.id,
      company: req.user._id,
    }).lean();
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const logs = await EmailLog.find({ campaign: campaign._id })
      .select('recipientEmail recipientName status error createdAt openedAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, campaign, logs });
  } catch (err) {
    console.error('[Emailer] Get campaign error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch campaign' });
  }
});

// ─── GET /api/emailer/logs ────────────────────────────────────────────────────

router.get('/logs', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, category, search } = req.query;
    const filter = { sender: req.user._id };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { recipientEmail: { $regex: search, $options: 'i' } },
        { recipientName: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const [logs, total] = await Promise.all([
      EmailLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      EmailLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    console.error('[Emailer] Get logs error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch logs' });
  }
});

// ─── GET /api/emailer/analytics ──────────────────────────────────────────────

router.get('/analytics', protect, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [statusStats, categoryStats, dailyStats, totalQuota] = await Promise.all([
      // By status
      EmailLog.aggregate([
        { $match: { sender: req.user._id, createdAt: { $gte: since } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // By category
      EmailLog.aggregate([
        { $match: { sender: req.user._id, createdAt: { $gte: since } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      // Daily sends (last N days)
      EmailLog.aggregate([
        { $match: { sender: req.user._id, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Quota history
      EmailQuota.find({ user: req.user._id }).sort({ date: -1 }).limit(30).lean(),
    ]);

    const summary = { sent: 0, failed: 0, queued: 0, bounced: 0, total: 0 };
    statusStats.forEach((s) => {
      summary[s._id] = s.count;
      summary.total += s.count;
    });

    res.json({
      success: true,
      summary,
      byCategory: categoryStats,
      dailyActivity: dailyStats,
      quotaHistory: totalQuota,
    });
  } catch (err) {
    console.error('[Emailer] Analytics error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// ─── GET /api/emailer/unsubscribe ─────────────────────────────────────────────
// (Handles clicks from email unsubscribe links)

router.get('/unsubscribe', async (req, res) => {
  try {
    const { email, token } = req.query;
    if (!email || !token) {
      return res.status(400).send('<h2>Invalid unsubscribe link</h2>');
    }

    const expected = generateUnsubscribeToken(email);
    if (token !== expected) {
      return res.status(400).send('<h2>Invalid or expired unsubscribe link</h2>');
    }

    // Mark latest log as unsubscribed for tracking
    await EmailLog.updateMany(
      { recipientEmail: email.toLowerCase() },
      { $set: { status: 'unsubscribed' } }
    );

    res.send(`
      <!DOCTYPE html><html><head><title>Unsubscribed</title>
      <style>body{font-family:sans-serif;text-align:center;padding:60px;background:#0f172a;color:#cbd5e1;}
      h1{color:#f8fafc;} p{color:#94a3b8;} a{color:#6366f1;}</style>
      </head><body>
      <h1>✅ You have been unsubscribed</h1>
      <p>You will no longer receive marketing emails from us.</p>
      <a href="https://resuming.io">Return to StackForce</a>
      </body></html>
    `);
  } catch (err) {
    console.error('[Emailer] Unsubscribe error:', err);
    res.status(500).send('<h2>Something went wrong. Please try again.</h2>');
  }
});

// ─── POST /api/emailer/send-otp ───────────────────────────────────────────────
// Internal use: auth service can call this directly

router.post('/send-otp', async (req, res) => {
  // Allow internal calls without auth token (validate via internal secret)
  const internalSecret = req.headers['x-internal-secret'];
  if (internalSecret !== process.env.INTERNAL_API_SECRET && process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  try {
    const { to, name, otp, expiryMinutes } = req.body;
    if (!to || !otp) {
      return res.status(400).json({ success: false, message: 'to and otp are required' });
    }

    await sendOTP(to, name || 'User', otp, { expiryMinutes });
    res.json({ success: true, message: `OTP sent to ${to}` });
  } catch (err) {
    console.error('[Emailer] Send OTP error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to send OTP' });
  }
});

// ─── GET /api/emailer/smtp-health ────────────────────────────────────────────

router.get('/smtp-health', protect, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Superadmin only' });
  }
  try {
    const healthy = await verifyConnection();
    res.json({
      success: true,
      smtp: {
        healthy,
        host: process.env.SMTP_HOST || 'mail.resuming.io',
        port: process.env.SMTP_PORT || 587,
        from: process.env.FROM_EMAIL || 'noreply@resuming.io',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
