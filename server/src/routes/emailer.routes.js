const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const Candidate = require('../models/Candidate');
const PoolResume = require('../models/PoolResume');
const EmailQuota = require('../models/EmailQuota');
const EmailTemplate = require('../models/EmailTemplate');
const EmailLog = require('../models/EmailLog');
const sendEmail = require('../services/emailService');

// Get today's YYYY-MM-DD string
const getTodayString = () => new Date().toISOString().split('T')[0];

/**
 * GET /api/emailer/contacts
 * Returns unified list of job hunters (Candidates + Talent Pool)
 */
router.get('/contacts', protect, async (req, res) => {
  try {
    const companyId = req.user._id;

    const candidates = await Candidate.find({ company: companyId })
      .select('name email phone college yearsOfExperience extractedSkills createdAt')
      .lean();

    const pool = await PoolResume.find({ company: companyId, processingStatus: 'done' })
      .select('name email phone college yearsOfExperience extractedSkills createdAt')
      .lean();

    const contactMap = new Map();

    candidates.forEach((c) => {
      if (c.email) {
        contactMap.set(c.email.toLowerCase(), {
          id: c._id,
          name: c.name || 'Candidate',
          email: c.email,
          phone: c.phone || '',
          college: c.college || '',
          experience: c.yearsOfExperience ? `${c.yearsOfExperience} yrs` : 'N/A',
          skills: c.extractedSkills || [],
          source: 'Job Applicant',
        });
      }
    });

    pool.forEach((p) => {
      if (p.email && !contactMap.has(p.email.toLowerCase())) {
        contactMap.set(p.email.toLowerCase(), {
          id: p._id,
          name: p.name || 'Talent Pool Lead',
          email: p.email,
          phone: p.phone || '',
          college: p.college || '',
          experience: p.yearsOfExperience ? `${p.yearsOfExperience} yrs` : 'N/A',
          skills: p.extractedSkills || [],
          source: 'Talent Pool',
        });
      }
    });

    const contacts = Array.from(contactMap.values());
    res.json({ success: true, count: contacts.length, contacts });
  } catch (err) {
    console.error('[Emailer] Get contacts error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch contacts' });
  }
});

/**
 * GET /api/emailer/quota
 * Returns remaining emails available for today
 */
router.get('/quota', protect, async (req, res) => {
  try {
    const today = getTodayString();
    const isSuperAdmin = req.user.role === 'superadmin';

    let quota = await EmailQuota.findOne({ user: req.user._id, date: today });
    if (!quota) {
      quota = await EmailQuota.create({ user: req.user._id, date: today, sentCount: 0, dailyLimit: 10 });
    }

    const remaining = isSuperAdmin ? 999999 : Math.max(0, quota.dailyLimit - quota.sentCount);

    res.json({
      success: true,
      sentCount: quota.sentCount,
      dailyLimit: isSuperAdmin ? 'Unlimited' : quota.dailyLimit,
      remaining,
      date: today,
    });
  } catch (err) {
    console.error('[Emailer] Get quota error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch quota' });
  }
});

/**
 * POST /api/emailer/send
 * Send bulk or single email to selected job hunters
 */
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

    const today = getTodayString();
    let quota = await EmailQuota.findOne({ user: req.user._id, date: today });
    if (!quota) {
      quota = await EmailQuota.create({ user: req.user._id, date: today, sentCount: 0, dailyLimit: 10 });
    }

    if (!isSuperAdmin && quota.sentCount + recipients.length > quota.dailyLimit) {
      const remaining = Math.max(0, quota.dailyLimit - quota.sentCount);
      return res.status(429).json({
        success: false,
        message: `Daily limit exceeded! You have ${remaining} emails remaining for today (Limit: ${quota.dailyLimit}/day).`,
      });
    }

    const results = [];
    for (const recipient of recipients) {
      const targetEmail = typeof recipient === 'string' ? recipient : recipient.email;
      const targetName = typeof recipient === 'object' ? recipient.name : '';
      const companyName = req.user.name || 'Our Team';

      // Parse tags in subject and body
      const parsedSubject = subject
        .replace(/\{\{\s*name\s*\}\}/gi, targetName || 'Candidate')
        .replace(/\{\{\s*company\s*\}\}/gi, companyName);

      const parsedBody = bodyHtml
        .replace(/\{\{\s*name\s*\}\}/gi, targetName || 'Candidate')
        .replace(/\{\{\s*company\s*\}\}/gi, companyName);

      try {
        await sendEmail({
          email: targetEmail,
          subject: parsedSubject,
          html: parsedBody,
          text: parsedBody.replace(/<[^>]+>/g, ''),
        });

        await EmailLog.create({
          sender: req.user._id,
          recipientEmail: targetEmail,
          recipientName: targetName,
          subject: parsedSubject,
          status: 'sent',
          category,
        });

        results.push({ email: targetEmail, status: 'sent' });
      } catch (sendErr) {
        await EmailLog.create({
          sender: req.user._id,
          recipientEmail: targetEmail,
          recipientName: targetName,
          subject: parsedSubject,
          status: 'failed',
          error: sendErr.message,
          category,
        });

        results.push({ email: targetEmail, status: 'failed', error: sendErr.message });
      }
    }

    // Increment sent quota count
    const successfulCount = results.filter((r) => r.status === 'sent').length;
    quota.sentCount += successfulCount;
    await quota.save();

    res.json({
      success: true,
      message: `Successfully processed ${results.length} email(s)`,
      successfulCount,
      quotaRemaining: isSuperAdmin ? 'Unlimited' : Math.max(0, quota.dailyLimit - quota.sentCount),
      results,
    });
  } catch (err) {
    console.error('[Emailer] Send email error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to send emails' });
  }
});

/**
 * GET /api/emailer/templates
 * List default and company custom templates
 */
router.get('/templates', protect, async (req, res) => {
  try {
    const templates = await EmailTemplate.find({ company: req.user._id }).lean();

    const defaultTemplates = [
      {
        _id: 'default-welcome',
        name: 'Welcome Email',
        category: 'welcome',
        subject: 'Welcome to {{company}} Talent Network!',
        bodyHtml: `<p>Hi <strong>{{name}}</strong>,</p><p>Welcome to <strong>{{company}}</strong>. We reviewed your profile and are excited to keep you updated on upcoming career opportunities!</p><p>Best regards,<br/>The Hiring Team at {{company}}</p>`,
      },
      {
        _id: 'default-otp',
        name: 'OTP Password Reset',
        category: 'otp',
        subject: 'Your Password Reset OTP - {{company}}',
        bodyHtml: `<p>Hi <strong>{{name}}</strong>,</p><p>Your verification OTP code for password reset is: <strong style="font-size: 20px; color: #2563eb;">849201</strong></p><p>This code is valid for 10 minutes.</p>`,
      },
      {
        _id: 'default-outreach',
        name: 'Job Opportunity Outreach',
        category: 'marketing',
        subject: 'Exploring technical opportunities at {{company}}',
        bodyHtml: `<p>Hi <strong>{{name}}</strong>,</p><p>I hope you are doing well!</p><p>I wanted to reach out because I believe your profile aligns well with our technical engineering openings at <strong>{{company}}</strong>.</p><p>Let's schedule a quick 15-minute introductory call!</p><p>Best regards,<br/>Recruiting Team</p>`,
      },
    ];

    res.json({ success: true, templates: [...defaultTemplates, ...templates] });
  } catch (err) {
    console.error('[Emailer] Get templates error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch templates' });
  }
});

module.exports = router;
