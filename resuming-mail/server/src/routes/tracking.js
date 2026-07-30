const express   = require('express');
const router    = express.Router();
const geoip     = require('geoip-lite');
const UAParser  = require('ua-parser-js');
const EmailLog  = require('../models/EmailLog');

// GET /api/track/open/:trackingId — open pixel
router.get('/open/:trackingId', async (req, res) => {
  // Return 1×1 transparent GIF immediately
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache' });
  res.send(pixel);

  // Log asynchronously (don't block response)
  setImmediate(async () => {
    try {
      const ua  = new UAParser(req.headers['user-agent'] || '');
      const ip  = req.ip || req.connection.remoteAddress || '';
      const geo = geoip.lookup(ip.replace('::ffff:', '')) || {};

      await EmailLog.findOneAndUpdate(
        { trackingId: req.params.trackingId },
        {
          $set:  { status: 'opened', openedAt: { $first: '$openedAt' } },
          $push: {
            opens: {
              openedAt: new Date(),
              userAgent: req.headers['user-agent'],
              ip,
              country: geo.country || '',
              city:    geo.city    || '',
              device:  ua.getDevice().type || 'desktop',
              browser: ua.getBrowser().name || '',
            },
          },
        }
      );
    } catch {}
  });
});

// GET /api/track/click/:trackingId — click redirect
router.get('/click/:trackingId', async (req, res) => {
  const { url } = req.query;
  const destination = url ? decodeURIComponent(url) : 'https://resuming.io';

  // Redirect immediately
  res.redirect(302, destination);

  // Log asynchronously
  setImmediate(async () => {
    try {
      const ua  = new UAParser(req.headers['user-agent'] || '');
      const ip  = req.ip || req.connection.remoteAddress || '';
      const geo = geoip.lookup(ip.replace('::ffff:', '')) || {};

      await EmailLog.findOneAndUpdate(
        { trackingId: req.params.trackingId },
        {
          $set:  { status: 'clicked', clickedAt: new Date() },
          $push: {
            clicks: {
              url: destination,
              clickedAt: new Date(),
              userAgent: req.headers['user-agent'],
              ip,
              country: geo.country || '',
              city:    geo.city    || '',
            },
          },
        }
      );
    } catch {}
  });
});

// GET /api/track/unsubscribe/:trackingId
router.get('/unsubscribe/:trackingId', async (req, res) => {
  try {
    const log = await EmailLog.findOne({ trackingId: req.params.trackingId });
    if (log && log.status !== 'unsubscribed') {
      const Contact = require('../models/Contact');
      const SuppressionList = require('../models/SuppressionList');
      log.status = 'unsubscribed';
      log.unsubscribedAt = new Date();
      await log.save();
      await Promise.allSettled([
        Contact.findOneAndUpdate({ email: log.recipientEmail }, { isUnsubscribed: true }),
        SuppressionList.findOneAndUpdate(
          { email: log.recipientEmail },
          { email: log.recipientEmail, reason: 'unsubscribed', campaign: log.campaign },
          { upsert: true }
        ),
      ]);
    }
  } catch {}
  // Redirect to unsubscribe confirmation page
  res.redirect(302, `${process.env.CLIENT_URL || 'https://mail.resuming.io'}/unsubscribed`);
});

module.exports = router;
