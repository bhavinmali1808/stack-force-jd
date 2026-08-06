/**
 * smtpService.js
 * ──────────────
 * Thin wrapper around Nodemailer transport.
 * Handles single sends, bulk queue population, and bounce detection.
 */

const { getTransport } = require('../config/smtp');

/**
 * Send a single email.
 * Returns { messageId, accepted, rejected }
 */
const sendEmail = async ({ to, toName, from, fromName, replyTo, subject, html, text, attachments = [] }) => {
  const transport = getTransport();
  const senderAddress = from || process.env.FROM_EMAIL || 'no-reply@resuming.io';

  const info = await transport.sendMail({
    from: `"${fromName || 'Resuming.io'}" <${senderAddress}>`,
    to: toName ? `"${toName}" <${to}>` : to,
    replyTo: replyTo || undefined,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
    attachments,
    headers: {
      'X-Mailer': 'Resuming.io Mail Platform',
      'List-Unsubscribe': `<https://mail.resuming.io/unsubscribe>`,
    },
  });

  return {
    messageId: info.messageId,
    accepted:  info.accepted || [],
    rejected:  info.rejected || [],
  };
};

/**
 * Classify SMTP error as hard bounce, soft bounce, or transient
 */
const classifyError = (err) => {
  const code = err.responseCode || err.code || 0;
  const msg  = (err.message || '').toLowerCase();

  if (code >= 500 || msg.includes('does not exist') || msg.includes('no such user') || msg.includes('unknown user')) {
    return 'hard';
  }
  if (code >= 400 || msg.includes('temporarily') || msg.includes('try again')) {
    return 'soft';
  }
  return 'soft';
};

module.exports = { sendEmail, classifyError };
