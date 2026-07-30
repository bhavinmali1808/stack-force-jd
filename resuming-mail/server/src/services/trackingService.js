/**
 * trackingService.js
 * ──────────────────
 * Injects open-tracking pixel + wraps all links with click-tracking URLs
 * into outgoing email HTML.
 */

const { v4: uuidv4 } = require('uuid');

const BASE = () => process.env.TRACKING_BASE_URL || 'https://mail.resuming.io';

/**
 * Generate a unique tracking ID (stored in EmailLog.trackingId)
 */
const generateTrackingId = () => uuidv4();

/**
 * Inject a 1×1 invisible tracking pixel before </body>
 */
const injectOpenPixel = (html, trackingId) => {
  const pixelUrl = `${BASE()}/api/track/open/${trackingId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;border:0;outline:none;text-decoration:none;" />`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }
  return html + pixel;
};

/**
 * Wrap all <a href="..."> links with click-tracking redirect
 * Skips mailto: and unsubscribe links
 */
const wrapLinks = (html, trackingId) => {
  return html.replace(/href="([^"]+)"/g, (match, url) => {
    if (url.startsWith('mailto:') || url.includes('/unsubscribe')) {
      return match;
    }
    const encoded = encodeURIComponent(url);
    const trackUrl = `${BASE()}/api/track/click/${trackingId}?url=${encoded}`;
    return `href="${trackUrl}"`;
  });
};

/**
 * Render template variables into HTML
 * Replaces {{variable_name}} with actual values
 */
const renderTemplate = (html, variables = {}) => {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? String(variables[key]) : match;
  });
};

/**
 * Full pipeline: render variables → inject pixel → wrap links
 */
const prepareEmail = (html, variables = {}, trackingId) => {
  let processed = renderTemplate(html, variables);
  processed = injectOpenPixel(processed, trackingId);
  processed = wrapLinks(processed, trackingId);
  return processed;
};

/**
 * Wrap HTML in a default email layout (dark brand style)
 */
const withLayout = (bodyHtml, { previewText = '' } = {}) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Resuming.io</title>
  ${previewText ? `<span style="display:none;font-size:1px;color:#fff;max-height:0;overflow:hidden;">${previewText}</span>` : ''}
  <style>
    body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#0f0f1a; color:#e2e8f0; }
    .wrapper { max-width:600px; margin:0 auto; padding:40px 20px; }
    .card { background:#1a1f35; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:40px; }
    .logo { text-align:center; margin-bottom:32px; }
    .logo span { font-size:24px; font-weight:800; background:linear-gradient(135deg,#6366f1,#8b5cf6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .footer { text-align:center; margin-top:24px; font-size:12px; color:#64748b; }
    .footer a { color:#6366f1; text-decoration:none; }
    a.btn { display:inline-block; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff !important; padding:14px 32px; border-radius:10px; text-decoration:none; font-weight:700; font-size:14px; margin:16px 0; }
    h1 { font-size:26px; font-weight:800; color:#f1f5f9; margin:0 0 16px; }
    p { font-size:15px; line-height:1.7; color:#94a3b8; margin:0 0 16px; }
    .otp-box { background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.3); border-radius:12px; padding:28px; text-align:center; margin:24px 0; }
    .otp-code { font-size:44px; font-weight:900; color:#a78bfa; letter-spacing:12px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo"><span>Resuming.io</span></div>
      ${bodyHtml}
    </div>
    <div class="footer">
      <p>Resuming.io · AI-Powered Resume Builder</p>
      <p><a href="{{unsubscribe_link}}">Unsubscribe</a> · <a href="https://resuming.io/privacy">Privacy Policy</a></p>
    </div>
  </div>
</body>
</html>`;

module.exports = { generateTrackingId, injectOpenPixel, wrapLinks, renderTemplate, prepareEmail, withLayout };
