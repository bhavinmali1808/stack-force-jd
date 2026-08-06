const Contact = require('../models/Contact');
const SuppressionList = require('../models/SuppressionList');
const EmailLog = require('../models/EmailLog');

/**
 * Process a Bounce Notification (DSN or SMTP Error)
 */
const processBounceNotification = async ({ email, campaignId, trackingId, reason = 'hard_bounce', rawMessage = '' }) => {
  if (!email || !email.includes('@')) return false;

  const cleanEmail = email.toLowerCase().trim();

  // 1. Add to suppression list if hard bounce or complaint
  if (reason === 'hard_bounce' || reason === 'complaint' || reason === 'spam_report') {
    await SuppressionList.findOneAndUpdate(
      { email: cleanEmail },
      { email: cleanEmail, reason, campaign: campaignId },
      { upsert: true }
    );

    // 2. Mark contact as inactive/unsubscribed
    await Contact.findOneAndUpdate(
      { email: cleanEmail },
      { isActive: false, isUnsubscribed: true }
    );
  }

  // 3. Update EmailLog status if trackingId or campaignId provided
  if (trackingId) {
    await EmailLog.findOneAndUpdate(
      { trackingId },
      { status: 'bounced', bouncedAt: new Date(), bounceReason: rawMessage || reason }
    );
  } else if (campaignId) {
    await EmailLog.findOneAndUpdate(
      { campaign: campaignId, recipientEmail: cleanEmail },
      { status: 'bounced', bouncedAt: new Date(), bounceReason: rawMessage || reason }
    );
  }

  return true;
};

/**
 * Parse raw DSN / ARF Email headers & body for bounce/abuse reports
 */
const parseArfAbuseReport = (rawText = '') => {
  const report = {
    email: '',
    feedbackType: 'abuse',
    userAgent: '',
    arrivalDate: '',
  };

  const recipientMatch = rawText.match(/Original-Rcpt-To:\s*<?([^>\s\r\n]+)>?/i) ||
                         rawText.match(/X-Original-To:\s*<?([^>\s\r\n]+)>?/i) ||
                         rawText.match(/Feedback-Type:\s*([a-z\-]+)/i);

  if (recipientMatch) {
    if (recipientMatch[1].includes('@')) {
      report.email = recipientMatch[1].toLowerCase().trim();
    }
  }

  return report;
};

module.exports = { processBounceNotification, parseArfAbuseReport };
