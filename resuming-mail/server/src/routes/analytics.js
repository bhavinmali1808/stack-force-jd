const express  = require('express');
const router   = express.Router();
const EmailLog = require('../models/EmailLog');
const Campaign = require('../models/Campaign');
const { protect } = require('../middleware/auth');

// GET /api/analytics/overview
router.get('/overview', protect, async (req, res) => {
  const { days = 30 } = req.query;
  const since = new Date();
  since.setDate(since.getDate() - parseInt(days, 10));

  const [totalCampaigns, logs, todayLogs] = await Promise.all([
    Campaign.countDocuments({ createdAt: { $gte: since } }),
    EmailLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: {
        _id: null,
        total:       { $sum: 1 },
        delivered:   { $sum: { $cond: [{ $in: ['$status', ['delivered','opened','clicked']] }, 1, 0] } },
        opened:      { $sum: { $cond: [{ $eq: ['$status', 'opened'] }, 1, 0] } },
        clicked:     { $sum: { $cond: [{ $eq: ['$status', 'clicked'] }, 1, 0] } },
        bounced:     { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } },
        failed:      { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        unsubscribed:{ $sum: { $cond: [{ $eq: ['$status', 'unsubscribed'] }, 1, 0] } },
      }},
    ]),
    EmailLog.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
  ]);

  const s = logs[0] || {};
  res.json({
    success: true,
    overview: {
      totalCampaigns,
      sentToday: todayLogs,
      total:       s.total       || 0,
      delivered:   s.delivered   || 0,
      opened:      s.opened      || 0,
      clicked:     s.clicked     || 0,
      bounced:     s.bounced     || 0,
      failed:      s.failed      || 0,
      unsubscribed:s.unsubscribed|| 0,
      deliveryRate: s.total ? ((s.delivered / s.total) * 100).toFixed(1) : 0,
      openRate:     s.delivered  ? ((s.opened  / s.delivered) * 100).toFixed(1) : 0,
      clickRate:    s.delivered  ? ((s.clicked / s.delivered) * 100).toFixed(1) : 0,
      bounceRate:   s.total      ? ((s.bounced / s.total)     * 100).toFixed(1) : 0,
    },
  });
});

// GET /api/analytics/daily — daily timeline
router.get('/daily', protect, async (req, res) => {
  const { days = 30 } = req.query;
  const since = new Date();
  since.setDate(since.getDate() - parseInt(days, 10));

  const daily = await EmailLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      sent:      { $sum: 1 },
      opened:    { $sum: { $cond: [{ $eq: ['$status','opened']  }, 1, 0] } },
      clicked:   { $sum: { $cond: [{ $eq: ['$status','clicked'] }, 1, 0] } },
      bounced:   { $sum: { $cond: [{ $eq: ['$status','bounced'] }, 1, 0] } },
    }},
    { $sort: { _id: 1 } },
  ]);

  res.json({ success: true, daily });
});

// GET /api/analytics/campaigns — per-campaign stats
router.get('/campaigns', protect, async (req, res) => {
  const campaigns = await Campaign.find({ status: { $in: ['sent','sending'] } })
    .select('name subject stats createdAt completedAt')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  res.json({ success: true, campaigns });
});

// GET /api/analytics/devices — device breakdown
router.get('/devices', protect, async (req, res) => {
  const data = await EmailLog.aggregate([
    { $unwind: '$opens' },
    { $group: { _id: '$opens.device', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  res.json({ success: true, devices: data });
});

// GET /api/analytics/geo — country breakdown
router.get('/geo', protect, async (req, res) => {
  const data = await EmailLog.aggregate([
    { $unwind: '$opens' },
    { $group: { _id: '$opens.country', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);
  res.json({ success: true, geo: data });
});

// GET /api/analytics/logs — paginated email log
router.get('/logs', protect, async (req, res) => {
  const { page = 1, limit = 50, campaignId, status, email } = req.query;
  const filter = {};
  if (campaignId) filter.campaign = campaignId;
  if (status)     filter.status   = status;
  if (email)      filter.recipientEmail = { $regex: email, $options: 'i' };

  const [logs, total] = await Promise.all([
    EmailLog.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit)
      .populate('campaign', 'name').lean(),
    EmailLog.countDocuments(filter),
  ]);

  res.json({ success: true, logs, total, page: +page, pages: Math.ceil(total/limit) });
});

module.exports = router;
