const express = require('express');
const router  = express.Router();
const Contact = require('../models/Contact');
const SuppressionList = require('../models/SuppressionList');
const { protect, notViewer } = require('../middleware/auth');

// GET /api/audience — paginated contact list
router.get('/', protect, async (req, res) => {
  const { page = 1, limit = 50, plan, isVerified, hasResume, search, tag } = req.query;
  const filter = {};
  if (plan)       filter.plan = plan;
  if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
  if (hasResume  !== undefined) filter.hasResume  = hasResume  === 'true';
  if (tag)        filter.tags = tag;
  if (search) {
    const q = { $regex: search, $options: 'i' };
    filter.$or = [{ email: q }, { firstName: q }, { lastName: q }];
  }

  const [contacts, total] = await Promise.all([
    Contact.find(filter).sort({ joinedAt: -1 }).skip((page-1)*limit).limit(+limit).lean(),
    Contact.countDocuments(filter),
  ]);

  res.json({ success: true, contacts, total, page: +page, pages: Math.ceil(total/limit) });
});

// GET /api/audience/stats
router.get('/stats', protect, async (req, res) => {
  const [total, premium, free, verified, hasResume, today] = await Promise.all([
    Contact.countDocuments({}),
    Contact.countDocuments({ plan: 'premium' }),
    Contact.countDocuments({ plan: 'free' }),
    Contact.countDocuments({ isVerified: true }),
    Contact.countDocuments({ hasResume: true }),
    Contact.countDocuments({ joinedAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
  ]);
  res.json({ success: true, stats: { total, premium, free, verified, hasResume, today } });
});

// GET /api/audience/export — export contacts as CSV
router.get('/export', protect, async (req, res) => {
  try {
    const { search, plan } = req.query;
    const filter = {};
    if (plan) filter.plan = plan;
    if (search) {
      const q = { $regex: search, $options: 'i' };
      filter.$or = [{ email: q }, { firstName: q }, { lastName: q }];
    }

    const contacts = await Contact.find(filter).sort({ joinedAt: -1 }).lean();

    let csv = 'Email,First Name,Last Name,Plan,Verified,Resume Title,Joined Date,Tags\n';
    contacts.forEach(c => {
      const email = `"${(c.email || '').replace(/"/g, '""')}"`;
      const firstName = `"${(c.firstName || '').replace(/"/g, '""')}"`;
      const lastName = `"${(c.lastName || '').replace(/"/g, '""')}"`;
      const planStr = `"${c.plan || 'free'}"`;
      const verified = c.isVerified ? 'Yes' : 'No';
      const resumeTitle = `"${(c.resumeTitle || '').replace(/"/g, '""')}"`;
      const joinedAt = `"${new Date(c.joinedAt || c.createdAt || Date.now()).toISOString()}"`;
      const tags = `"${(Array.isArray(c.tags) ? c.tags : []).join(';')}"`;
      csv += `${email},${firstName},${lastName},${planStr},${verified},${resumeTitle},${joinedAt},${tags}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audience_contacts.csv');
    res.status(200).send(csv);
  } catch (err) {
    console.error('[Audience Export Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to export contacts' });
  }
});

// POST /api/audience — add single contact
router.post('/', protect, notViewer, async (req, res) => {
  try {
    const { email, firstName, lastName, plan, isVerified, resumeTitle, tags } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await Contact.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: `Contact with email '${cleanEmail}' already exists` });
    }

    const validPlans = ['free', 'trial', 'premium', 'enterprise'];
    const cleanPlan = plan && validPlans.includes(plan.toLowerCase()) ? plan.toLowerCase() : 'free';

    const parsedTags = Array.isArray(tags)
      ? tags.map(t => String(t).trim()).filter(Boolean)
      : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : []);

    const contact = await Contact.create({
      email: cleanEmail,
      firstName: firstName ? firstName.trim() : '',
      lastName: lastName ? lastName.trim() : '',
      plan: cleanPlan,
      isVerified: isVerified !== undefined ? Boolean(isVerified) : true,
      resumeTitle: resumeTitle ? resumeTitle.trim() : '',
      tags: parsedTags,
      source: 'manual',
    });

    res.status(201).json({ success: true, contact });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Contact with this email already exists' });
    }
    res.status(500).json({ success: false, message: err.message || 'Failed to create contact' });
  }
});

// POST /api/audience/import — bulk import array of contacts
router.post('/import', protect, notViewer, async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ success: false, message: 'contacts array required' });
    }

    const validPlans = ['free', 'trial', 'premium', 'enterprise'];
    const ops = [];

    for (const c of contacts) {
      if (!c || !c.email || typeof c.email !== 'string') continue;
      const email = c.email.toLowerCase().trim();
      if (!email || !email.includes('@')) continue;

      const cleanData = { ...c };
      delete cleanData._id;

      const planVal = cleanData.plan ? String(cleanData.plan).toLowerCase() : 'free';
      cleanData.plan = validPlans.includes(planVal) ? planVal : 'free';
      cleanData.email = email;
      cleanData.source = cleanData.source || 'import';

      if (cleanData.tags && typeof cleanData.tags === 'string') {
        cleanData.tags = cleanData.tags.split(',').map(t => t.trim()).filter(Boolean);
      } else if (!Array.isArray(cleanData.tags)) {
        cleanData.tags = [];
      }

      ops.push({
        updateOne: {
          filter: { email },
          update: { $set: cleanData },
          upsert: true,
        },
      });
    }

    if (ops.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid contacts with emails provided for import' });
    }

    const result = await Contact.bulkWrite(ops, { ordered: false });
    const upsertedCount = result.upsertedCount ?? (result.upsertedIds ? Object.keys(result.upsertedIds).length : 0);
    const modifiedCount = result.modifiedCount ?? 0;

    res.json({
      success: true,
      upserted: upsertedCount,
      modified: modifiedCount,
      total: ops.length,
    });
  } catch (err) {
    console.error('[Audience Import Error]:', err);
    res.status(500).json({ success: false, message: err.message || 'Bulk import failed' });
  }
});

// PUT /api/audience/:id
router.put('/:id', protect, notViewer, async (req, res) => {
  const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, contact });
});

// DELETE /api/audience/:id — suppress + remove
router.delete('/:id', protect, notViewer, async (req, res) => {
  const contact = await Contact.findByIdAndDelete(req.params.id);
  if (contact) {
    await SuppressionList.findOneAndUpdate(
      { email: contact.email },
      { email: contact.email, reason: 'manual' },
      { upsert: true }
    );
  }
  res.json({ success: true, message: 'Contact removed and suppressed' });
});

// GET /api/audience/unsubscribe/:trackingId — handle unsubscribe link
router.get('/unsubscribe/:trackingId', async (req, res) => {
  const EmailLog = require('../models/EmailLog');
  const log = await EmailLog.findOne({ trackingId: req.params.trackingId });
  if (log) {
    log.status = 'unsubscribed';
    log.unsubscribedAt = new Date();
    await log.save();
    await Contact.findOneAndUpdate({ email: log.recipientEmail }, { isUnsubscribed: true });
    await SuppressionList.findOneAndUpdate(
      { email: log.recipientEmail },
      { email: log.recipientEmail, reason: 'unsubscribed', campaign: log.campaign },
      { upsert: true }
    );
  }
  res.redirect(`${process.env.CLIENT_URL || 'https://mail.resuming.io'}/unsubscribed`);
});

module.exports = router;
