const express = require('express');
const router = express.Router();
const { protect, notViewer } = require('../middleware/auth');
const IPPool = require('../models/IPPool');
const { getWarmupQuota, checkRblBlacklists, WARMUP_SCHEDULE } = require('../services/ipWarmupService');

// GET /api/deliverability/ips — list tracked IPs and their warmup status
router.get('/ips', protect, async (req, res) => {
  const ips = await IPPool.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, ips, schedule: WARMUP_SCHEDULE });
});

// POST /api/deliverability/ips — register IP
router.post('/ips', protect, notViewer, async (req, res) => {
  const { ipAddress, hostname } = req.body;
  if (!ipAddress) return res.status(400).json({ success: false, message: 'IP address required' });

  const blacklists = await checkRblBlacklists(ipAddress);
  const ip = await IPPool.create({
    ipAddress: ipAddress.trim(),
    hostname: hostname ? hostname.trim() : '',
    warmupDay: 1,
    dailyQuota: getWarmupQuota(1),
    blacklists,
  });

  res.status(201).json({ success: true, ip });
});

// POST /api/deliverability/ips/:id/check-rbl — trigger blacklist check
router.post('/ips/:id/check-rbl', protect, notViewer, async (req, res) => {
  const ip = await IPPool.findById(req.params.id);
  if (!ip) return res.status(404).json({ success: false, message: 'IP not found' });

  const blacklists = await checkRblBlacklists(ip.ipAddress);
  const anyListed = blacklists.some(b => b.listed);

  ip.blacklists = blacklists;
  if (anyListed) ip.status = 'blacklisted';
  else if (ip.status === 'blacklisted') ip.status = 'active';
  await ip.save();

  res.json({ success: true, ip, anyListed });
});

// POST /api/deliverability/ips/:id/advance-warmup — advance warmup day
router.post('/ips/:id/advance-warmup', protect, notViewer, async (req, res) => {
  const ip = await IPPool.findById(req.params.id);
  if (!ip) return res.status(404).json({ success: false, message: 'IP not found' });

  ip.warmupDay += 1;
  ip.dailyQuota = getWarmupQuota(ip.warmupDay);
  if (ip.warmupDay >= 30) ip.status = 'active';
  await ip.save();

  res.json({ success: true, ip });
});

// POST /api/deliverability/test-spam — analyze email body for spam score
router.post('/test-spam', protect, async (req, res) => {
  const { analyzeSpamScore } = require('../services/spamFilterService');
  const { subject, html, text } = req.body;
  const analysis = analyzeSpamScore({ subject, html, text });
  res.json({ success: true, analysis });
});

module.exports = router;
