const express = require('express');
const router = express.Router();
const { protect, notViewer } = require('../middleware/auth');
const { generateDKIMKeys, verifyDomainDNS } = require('../services/dnsService');

// GET /api/dns/verify?domain=resuming.io&selector=default
router.get('/verify', protect, async (req, res) => {
  const domain = req.query.domain || process.env.MAIL_DOMAIN || 'resuming.io';
  const selector = req.query.selector || 'default';
  const audit = await verifyDomainDNS(domain, selector);
  res.json({ success: true, audit });
});

// POST /api/dns/generate-dkim
router.post('/generate-dkim', protect, notViewer, async (req, res) => {
  const { domain = 'resuming.io', selector = 'default' } = req.body;
  const keys = generateDKIMKeys(selector, domain);
  res.json({ success: true, keys });
});

module.exports = router;
