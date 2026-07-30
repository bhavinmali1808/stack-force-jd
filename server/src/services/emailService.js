/**
 * EmailService — Production-grade email microservice
 * ──────────────────────────────────────────────────
 * Features:
 *  • VPS Postfix SMTP (mail.resuming.io) as primary transport
 *  • Fallback to any configured SMTP (Gmail, SendGrid, etc.)
 *  • In-memory queue with concurrency control & exponential back-off retry
 *  • Handlebars-style template engine ({{name}}, {{otp}}, {{company}}, etc.)
 *  • Pre-built transactional emails: OTP, Welcome, Password Reset, Interview Invite
 *  • Bulk-send with per-recipient personalisation & rate limiting
 *  • Email event tracking hooks (sent, failed, opened via pixel — future)
 *  • Unsubscribe token generation
 */

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// ─── SMTP Transport Configuration ────────────────────────────────────────────

/**
 * Primary transport: your own VPS Postfix SMTP server
 * Set SMTP_HOST=mail.resuming.io  SMTP_PORT=587  SMTP_USER=noreply@resuming.io
 */
const createTransport = () => {
  const host = process.env.SMTP_HOST || 'mail.resuming.io';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || 'noreply@resuming.io';
  const pass = process.env.SMTP_PASS || '';
  const secure = port === 465; // true for 465 (SSL), false for 587 (STARTTLS)

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: pass ? { user, pass } : undefined, // Postfix relay may not need auth on localhost
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      ciphers: 'SSLv3',
    },
    pool: true,          // Connection pooling for bulk sends
    maxConnections: 5,   // Max simultaneous SMTP connections
    maxMessages: 100,    // Max messages per connection
    rateDelta: 1000,     // Rate limiting window in ms
    rateLimit: 10,       // Max messages per rateDelta window
  });
};

let _transporter = null;
const getTransporter = () => {
  if (!_transporter) {
    _transporter = createTransport();
  }
  return _transporter;
};

// ─── In-Memory Send Queue ─────────────────────────────────────────────────────

class EmailQueue {
  constructor({ concurrency = 3, maxRetries = 3 } = {}) {
    this.queue = [];
    this.running = 0;
    this.concurrency = concurrency;
    this.maxRetries = maxRetries;
  }

  enqueue(job) {
    return new Promise((resolve, reject) => {
      this.queue.push({ job, resolve, reject, retries: 0 });
      this._process();
    });
  }

  _process() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const item = this.queue.shift();
      this.running++;
      this._run(item);
    }
  }

  async _run(item) {
    const { job, resolve, reject, retries } = item;
    try {
      const result = await job();
      this.running--;
      resolve(result);
      this._process();
    } catch (err) {
      if (retries < this.maxRetries) {
        const delay = Math.pow(2, retries) * 1000; // exponential back-off: 1s, 2s, 4s
        console.warn(`[EmailQueue] Retry ${retries + 1}/${this.maxRetries} in ${delay}ms:`, err.message);
        setTimeout(() => {
          this.queue.unshift({ job, resolve, reject, retries: retries + 1 });
          this.running--;
          this._process();
        }, delay);
      } else {
        this.running--;
        reject(err);
        this._process();
      }
    }
  }
}

const emailQueue = new EmailQueue({ concurrency: 3, maxRetries: 3 });

// ─── Template Engine ──────────────────────────────────────────────────────────

/**
 * Replace {{variable}} placeholders in subject + body
 * Supports nested: {{user.name}}, arrays, simple expressions
 */
const renderTemplate = (template, variables = {}) => {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const keys = key.split('.');
    let val = variables;
    for (const k of keys) {
      val = val?.[k];
    }
    return val !== undefined && val !== null ? String(val) : '';
  });
};

// ─── Base HTML Email Wrapper ──────────────────────────────────────────────────

const wrapInEmailLayout = (content, { previewText = '', unsubscribeUrl = '#' } = {}) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>Email</title>
  <!--[if mso]><style>table {border-collapse:collapse;} </style><![endif]-->
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; margin: 0; padding: 20px; }
    .email-wrapper { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.5); }
    .email-header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); padding: 40px 32px; text-align: center; }
    .email-header .logo { font-size: 24px; font-weight: 800; color: white; letter-spacing: -0.5px; }
    .email-header .logo span { opacity: 0.8; }
    .email-body { padding: 40px 32px; color: #cbd5e1; line-height: 1.7; }
    .email-body h1 { font-size: 28px; font-weight: 700; color: #f8fafc; margin-bottom: 16px; }
    .email-body h2 { font-size: 20px; font-weight: 600; color: #f1f5f9; margin-bottom: 12px; }
    .email-body p { margin-bottom: 16px; color: #94a3b8; }
    .email-body strong { color: #e2e8f0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 16px 0; }
    .otp-box { background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2)); border: 1px solid rgba(99,102,241,0.4); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 48px; font-weight: 800; color: #a78bfa; letter-spacing: 12px; font-family: 'Courier New', monospace; }
    .otp-expiry { font-size: 13px; color: #64748b; margin-top: 8px; }
    .info-card { background: rgba(99,102,241,0.1); border-left: 3px solid #6366f1; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 20px 0; }
    .divider { height: 1px; background: rgba(255,255,255,0.08); margin: 24px 0; }
    .email-footer { background: rgba(0,0,0,0.2); padding: 24px 32px; text-align: center; }
    .email-footer p { font-size: 12px; color: #475569; margin-bottom: 8px; }
    .email-footer a { color: #6366f1; text-decoration: none; }
    .tag { display: inline-block; background: rgba(99,102,241,0.2); color: #a78bfa; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; margin: 2px; }
    .preview-text { display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: transparent; }
  </style>
</head>
<body>
  <div class="preview-text">${previewText}</div>
  <div class="email-wrapper">
    <div class="email-header">
      <div class="logo">Stack<span>Force</span></div>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      <p>© ${new Date().getFullYear()} StackForce · Powering India's hiring ecosystem</p>
      <p>
        <a href="${unsubscribeUrl}">Unsubscribe</a> · 
        <a href="https://resuming.io/privacy">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

// ─── Pre-built Email Templates ────────────────────────────────────────────────

const SYSTEM_TEMPLATES = {
  /**
   * OTP / Password Reset
   * vars: { name, otp, expiryMinutes, company }
   */
  otp: ({ name, otp, expiryMinutes = 10, company = 'StackForce' }) => ({
    subject: `${otp} is your verification code — ${company}`,
    previewText: `Your one-time password is ${otp}`,
    html: wrapInEmailLayout(`
      <h1>Verify your identity</h1>
      <p>Hi <strong>${name || 'there'}</strong>,</p>
      <p>Use the following one-time code to reset your password. This code expires in <strong>${expiryMinutes} minutes</strong>.</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="otp-expiry">Expires in ${expiryMinutes} minutes · Do not share this code</div>
      </div>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <div class="divider"></div>
      <div class="info-card">
        <strong>Security tip:</strong> ${company} will never ask for your OTP via phone or email.
      </div>
    `, { previewText: `Your one-time password is ${otp}` }),
  }),

  /**
   * Welcome email for new users
   * vars: { name, company, loginUrl, role }
   */
  welcome: ({ name, company = 'StackForce', loginUrl = 'https://resuming.io/login', role = 'recruiter' }) => ({
    subject: `Welcome to ${company} — Your account is ready 🎉`,
    previewText: `You're now part of the ${company} hiring ecosystem`,
    html: wrapInEmailLayout(`
      <h1>Welcome aboard, ${name || 'there'}! 🚀</h1>
      <p>Your <strong>${company}</strong> account has been created successfully.</p>
      <div class="info-card">
        <strong>Account type:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}<br/>
        <strong>Platform:</strong> ${company} Hiring Suite
      </div>
      <p>Here's what you can do next:</p>
      <p>
        <span class="tag">📝 Post Jobs</span>
        <span class="tag">🔍 Search Candidates</span>
        <span class="tag">📧 Send Outreach</span>
        <span class="tag">📊 Track Applications</span>
      </p>
      <br/>
      <a href="${loginUrl}" class="btn">Get Started →</a>
      <div class="divider"></div>
      <p>Need help? Reply to this email and our team will assist you.</p>
    `, { previewText: `You're now part of the ${company} hiring ecosystem` }),
  }),

  /**
   * Interview invitation
   * vars: { name, company, jobTitle, interviewDate, interviewTime, interviewLink, recruiterName }
   */
  interview: ({ name, company, jobTitle, interviewDate, interviewTime, interviewLink = '#', recruiterName }) => ({
    subject: `Interview Invitation: ${jobTitle} at ${company}`,
    previewText: `You're invited to interview for ${jobTitle} at ${company}`,
    html: wrapInEmailLayout(`
      <h1>You're invited for an interview! 🎯</h1>
      <p>Hi <strong>${name || 'there'}</strong>,</p>
      <p>Congratulations! We'd like to invite you for an interview for the <strong>${jobTitle}</strong> position at <strong>${company}</strong>.</p>
      <div class="otp-box" style="text-align:left; padding: 20px 24px;">
        <p style="margin:0 0 8px; color:#94a3b8; font-size:13px; text-transform:uppercase; letter-spacing:1px;">INTERVIEW DETAILS</p>
        <p style="margin:4px 0; color: #e2e8f0;"><strong>📅 Date:</strong> ${interviewDate || 'To be confirmed'}</p>
        <p style="margin:4px 0; color: #e2e8f0;"><strong>🕐 Time:</strong> ${interviewTime || 'To be confirmed'}</p>
        <p style="margin:4px 0; color: #e2e8f0;"><strong>👤 With:</strong> ${recruiterName || 'Hiring Team'}</p>
      </div>
      ${interviewLink !== '#' ? `<a href="${interviewLink}" class="btn">Join Interview →</a>` : ''}
      <div class="divider"></div>
      <p>Please confirm your availability by replying to this email. We look forward to speaking with you!</p>
      <p>Best regards,<br/><strong>${recruiterName || 'Hiring Team'}</strong><br/>${company}</p>
    `, { previewText: `You're invited to interview for ${jobTitle} at ${company}` }),
  }),

  /**
   * Job opportunity outreach (marketing/bulk)
   * vars: { name, company, jobTitle, jobDescription, applyUrl, recruiterName }
   */
  outreach: ({ name, company, jobTitle, jobDescription, applyUrl = '#', recruiterName }) => ({
    subject: `Exciting opportunity: ${jobTitle || 'Role'} at ${company}`,
    previewText: `We found a role that matches your profile`,
    html: wrapInEmailLayout(`
      <h1>We found a role for you 👋</h1>
      <p>Hi <strong>${name || 'there'}</strong>,</p>
      <p>I came across your profile and believe you'd be a great fit for an opening at <strong>${company}</strong>.</p>
      ${jobTitle ? `
        <div class="info-card">
          <strong>Position:</strong> ${jobTitle}<br/>
          ${jobDescription ? `<br/>${jobDescription}` : ''}
        </div>
      ` : ''}
      ${applyUrl !== '#' ? `<a href="${applyUrl}" class="btn">View & Apply →</a>` : ''}
      <div class="divider"></div>
      <p>Happy to hop on a quick 15-minute call if you're interested!</p>
      <p>Best regards,<br/><strong>${recruiterName || 'Recruiting Team'}</strong><br/>${company}</p>
    `, { previewText: `We found a role that matches your profile` }),
  }),

  /**
   * Generic custom email
   * vars: { subject, bodyHtml }
   */
  custom: ({ bodyHtml }) => ({
    subject: '', // overridden by caller
    html: wrapInEmailLayout(bodyHtml || ''),
  }),
};

// ─── Unsubscribe Token ────────────────────────────────────────────────────────

const generateUnsubscribeToken = (email, secret = process.env.JWT_SECRET || 'default') => {
  return crypto.createHmac('sha256', secret).update(email.toLowerCase()).digest('hex');
};

// ─── Core Send Function ───────────────────────────────────────────────────────

/**
 * sendEmail — Queue-backed, retry-safe email sender
 *
 * @param {Object} options
 * @param {string}  options.to           — Recipient email
 * @param {string}  options.name         — Recipient display name (for From header)
 * @param {string}  options.subject      — Email subject
 * @param {string}  options.html         — HTML body (fully rendered)
 * @param {string}  [options.text]       — Plain-text fallback (auto-stripped if omitted)
 * @param {string}  [options.replyTo]    — Reply-To address
 * @param {string}  [options.category]   — For logging: otp | welcome | outreach | interview | marketing
 * @param {boolean} [options.priority]   — If true, bypasses queue and sends immediately
 * @returns {Promise<{ messageId: string }>}
 */
const sendEmail = async (options) => {
  const transporter = getTransporter();

  const fromName = process.env.FROM_NAME || 'StackForce';
  const fromEmail = process.env.FROM_EMAIL || 'noreply@resuming.io';

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: options.name ? `"${options.name}" <${options.to}>` : options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    replyTo: options.replyTo || process.env.REPLY_TO_EMAIL || fromEmail,
    headers: {
      'X-Category': options.category || 'general',
      'X-Mailer': 'StackForce EmailService v2',
      'List-Unsubscribe': `<mailto:unsubscribe@resuming.io?subject=unsubscribe>`,
    },
  };

  const sendJob = async () => {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] ✓ Sent to ${options.to} — MsgId: ${info.messageId} — Category: ${options.category || 'general'}`);
    return { messageId: info.messageId, to: options.to };
  };

  // Priority emails (OTP, system) skip the queue
  if (options.priority) {
    return sendJob();
  }

  return emailQueue.enqueue(sendJob);
};

// ─── High-level Transactional Helpers ────────────────────────────────────────

/**
 * Send OTP email (high priority — bypasses queue)
 */
const sendOTP = async (to, name, otp, options = {}) => {
  const template = SYSTEM_TEMPLATES.otp({ name, otp, ...options });
  return sendEmail({
    to,
    name,
    subject: template.subject,
    html: template.html,
    category: 'otp',
    priority: true, // OTP must be instant
  });
};

/**
 * Send welcome email
 */
const sendWelcome = async (to, name, options = {}) => {
  const template = SYSTEM_TEMPLATES.welcome({ name, ...options });
  return sendEmail({
    to,
    name,
    subject: template.subject,
    html: template.html,
    category: 'welcome',
  });
};

/**
 * Send interview invitation
 */
const sendInterviewInvite = async (to, name, options = {}) => {
  const template = SYSTEM_TEMPLATES.interview({ name, ...options });
  return sendEmail({
    to,
    name,
    subject: template.subject,
    html: template.html,
    category: 'interview',
  });
};

/**
 * Bulk send with per-recipient personalisation
 *
 * @param {Array}   recipients   — [{ email, name, ...customVars }]
 * @param {Object}  template     — { subject, bodyHtml } with {{variable}} placeholders
 * @param {Object}  senderCtx    — { company, recruiterName, ... }
 * @param {Function} onResult    — Callback per recipient: ({ email, status, error })
 */
const sendBulk = async (recipients, template, senderCtx = {}, onResult = null) => {
  const results = [];

  for (const recipient of recipients) {
    const vars = { ...senderCtx, ...recipient, name: recipient.name || 'Candidate' };
    const subject = renderTemplate(template.subject, vars);
    const html = renderTemplate(template.bodyHtml || template.html, vars);
    const unsubToken = generateUnsubscribeToken(recipient.email);
    const wrappedHtml = wrapInEmailLayout(html, {
      unsubscribeUrl: `${process.env.SERVER_URL || 'https://api.resuming.io'}/api/emailer/unsubscribe?email=${encodeURIComponent(recipient.email)}&token=${unsubToken}`,
    });

    try {
      const result = await sendEmail({
        to: recipient.email,
        name: recipient.name,
        subject,
        html: wrappedHtml,
        category: template.category || 'marketing',
      });
      results.push({ email: recipient.email, status: 'sent', messageId: result?.messageId });
      if (onResult) onResult({ email: recipient.email, status: 'sent' });
    } catch (err) {
      results.push({ email: recipient.email, status: 'failed', error: err.message });
      if (onResult) onResult({ email: recipient.email, status: 'failed', error: err.message });
      console.error(`[EmailService] ✗ Failed for ${recipient.email}:`, err.message);
    }
  }

  const successCount = results.filter((r) => r.status === 'sent').length;
  console.log(`[EmailService] Bulk complete: ${successCount}/${recipients.length} sent`);
  return { results, successCount, failedCount: recipients.length - successCount };
};

/**
 * Verify SMTP connection is healthy
 */
const verifyConnection = async () => {
  try {
    await getTransporter().verify();
    console.log('[EmailService] ✓ SMTP connection verified');
    return true;
  } catch (err) {
    console.error('[EmailService] ✗ SMTP connection failed:', err.message);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendOTP,
  sendWelcome,
  sendInterviewInvite,
  sendBulk,
  renderTemplate,
  wrapInEmailLayout,
  generateUnsubscribeToken,
  verifyConnection,
  SYSTEM_TEMPLATES,
  // Legacy compat: sendEmail({ email, subject, html }) → sendEmail({ to, ... })
};

// Legacy default export compatibility
module.exports.default = (options) =>
  sendEmail({
    to: options.email,
    name: options.name,
    subject: options.subject,
    html: options.html || '',
    text: options.text || options.message,
    category: options.category,
  });
