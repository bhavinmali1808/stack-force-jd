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

// POST /api/audience — add single contact
router.post('/', protect, notViewer, async (req, res) => {
  const contact = await Contact.create({ ...req.body, source: 'manual' });
  res.status(201).json({ success: true, contact });
});

// POST /api/audience/import — bulk import array of contacts
router.post('/import', protect, notViewer, async (req, res) => {
  const { contacts } = req.body;
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ success: false, message: 'contacts array required' });
  }
  const ops = contacts.map(c => ({
    updateOne: {
      filter: { email: c.email?.toLowerCase() },
      update: { $set: { ...c, email: c.email?.toLowerCase(), source: c.source || 'import' } },
      upsert: true,
    },
  }));
  const result = await Contact.bulkWrite(ops, { ordered: false });
  res.json({ success: true, upserted: result.upsertedCount, modified: result.modifiedCount, total: contacts.length });
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
