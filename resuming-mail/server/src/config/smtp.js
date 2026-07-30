const nodemailer = require('nodemailer');

let _transport;

const getTransport = () => {
  if (_transport) return _transport;

  _transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    pool: true,
    maxConnections: parseInt(process.env.SMTP_MAX_CONNECTIONS || '5', 10),
    maxMessages: 100,
    rateLimit: parseInt(process.env.EMAIL_RATE || '10', 10), // emails/sec
    rateDelta: 1000,
    tls: { rejectUnauthorized: false },
  });

  console.log(`✅ [SMTP] Transport ready → ${process.env.SMTP_HOST || 'localhost'}:${process.env.SMTP_PORT || 587}`);
  return _transport;
};

const verifySmtp = async () => {
  try {
    await getTransport().verify();
    return { ok: true, message: 'SMTP connection verified' };
  } catch (err) {
    return { ok: false, message: err.message };
  }
};

module.exports = { getTransport, verifySmtp };
