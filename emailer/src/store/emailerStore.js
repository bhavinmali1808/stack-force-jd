/**
 * emailerStore — LocalStorage-backed fallback data store
 * ───────────────────────────────────────────────────────
 * When the backend API is unreachable or returns 401/403,
 * all CRUD operations fall back to localStorage so the panel
 * works fully in demo/offline mode.
 *
 * Usage:
 *   import store from '../store/emailerStore';
 *   const templates = await store.templates.list();
 *   await store.templates.create({ name, subject, bodyHtml, category });
 */

import { nanoid } from 'nanoid';
import api from '../api';

// ─── Default system templates (always shown) ─────────────────

export const SYSTEM_TEMPLATES = [
  {
    _id: 'sys-welcome',
    name: 'Welcome Email',
    category: 'welcome',
    isSystem: true,
    subject: 'Welcome to {{company}} Talent Network! 🎉',
    bodyHtml: `<p>Hi <strong>{{name}}</strong>,</p>
<p>Your account at <strong>{{company}}</strong> is now active.</p>
<p>We're excited to have you on board. Start exploring opportunities today.</p>
<a href="{{loginUrl}}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:12px 0;">Get Started →</a>`,
  },
  {
    _id: 'sys-otp',
    name: 'OTP / Password Reset',
    category: 'otp',
    isSystem: true,
    subject: '{{otp}} — Your verification code',
    bodyHtml: `<p>Hi <strong>{{name}}</strong>, your one-time verification code is:</p>
<div style="background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:24px;text-align:center;margin:20px 0;">
  <div style="font-size:40px;font-weight:800;color:#a78bfa;letter-spacing:10px;">{{otp}}</div>
  <div style="font-size:12px;color:#64748b;margin-top:8px;">Expires in {{expiryMinutes}} minutes · Do not share</div>
</div>
<p>If you did not request this, ignore this email.</p>`,
  },
  {
    _id: 'sys-outreach',
    name: 'Job Outreach',
    category: 'outreach',
    isSystem: true,
    subject: 'Exciting opportunity: {{jobTitle}} at {{company}}',
    bodyHtml: `<p>Hi <strong>{{name}}</strong>,</p>
<p>I came across your profile and believe you'd be a great fit for the <strong>{{jobTitle}}</strong> position at <strong>{{company}}</strong>.</p>
<p>{{jobDescription}}</p>
<a href="{{applyUrl}}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:12px 0;">View & Apply →</a>
<p>Best regards,<br/><strong>{{recruiterName}}</strong><br/>{{company}}</p>`,
  },
  {
    _id: 'sys-interview',
    name: 'Interview Invitation',
    category: 'interview',
    isSystem: true,
    subject: 'Interview Invitation: {{jobTitle}} at {{company}}',
    bodyHtml: `<p>Hi <strong>{{name}}</strong>,</p>
<p>We'd like to invite you to interview for <strong>{{jobTitle}}</strong> at <strong>{{company}}</strong>.</p>
<div style="background:rgba(99,102,241,0.1);border-left:3px solid #6366f1;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0;">
  <p style="margin:4px 0;"><strong>📅 Date:</strong> {{interviewDate}}</p>
  <p style="margin:4px 0;"><strong>🕐 Time:</strong> {{interviewTime}}</p>
  <p style="margin:4px 0;"><strong>👤 With:</strong> {{recruiterName}}</p>
</div>
<a href="{{interviewLink}}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:12px 0;">Join Interview →</a>
<p>Please confirm by replying to this email.</p>`,
  },
  {
    _id: 'sys-newsletter',
    name: 'Company Newsletter',
    category: 'marketing',
    isSystem: true,
    subject: '{{company}} — {{month}} Hiring Update',
    bodyHtml: `<p>Hi <strong>{{name}}</strong>,</p>
<p>Here's what's new at <strong>{{company}}</strong> this month.</p>
<p>{{content}}</p>
<a href="{{ctaUrl}}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:12px 0;">{{ctaText}}</a>`,
  },
];

// ─── LocalStorage helpers ─────────────────────────────────────

const LS_KEYS = {
  templates: 'sf_emailer_templates',
  campaigns: 'sf_emailer_campaigns',
  logs:      'sf_emailer_logs',
  contacts:  'sf_emailer_contacts',
  quota:     'sf_emailer_quota',
};

const lsGet = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch { return null; }
};

const lsSet = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); }
  catch {}
};

// ─── Templates Store ──────────────────────────────────────────

const templateStore = {
  async list() {
    try {
      const res = await api.get('/emailer/templates');
      if (res.data.success) {
        const all = res.data.templates;
        lsSet(LS_KEYS.templates, all.filter(t => !t.isSystem));
        return all;
      }
    } catch {
      // Fallback: merge system + localStorage custom templates
    }
    const local = lsGet(LS_KEYS.templates) || [];
    return [...SYSTEM_TEMPLATES, ...local];
  },

  async create(data) {
    try {
      const res = await api.post('/emailer/templates', data);
      if (res.data.success) return res.data.template;
    } catch {}
    // LocalStorage fallback
    const local = lsGet(LS_KEYS.templates) || [];
    const newT = { ...data, _id: `local-${nanoid(8)}`, isSystem: false, createdAt: new Date().toISOString() };
    lsSet(LS_KEYS.templates, [...local, newT]);
    return newT;
  },

  async update(id, data) {
    try {
      const res = await api.put(`/emailer/templates/${id}`, data);
      if (res.data.success) return res.data.template;
    } catch {}
    const local = lsGet(LS_KEYS.templates) || [];
    const updated = local.map(t => t._id === id ? { ...t, ...data } : t);
    lsSet(LS_KEYS.templates, updated);
    return updated.find(t => t._id === id);
  },

  async delete(id) {
    try {
      await api.delete(`/emailer/templates/${id}`);
      return;
    } catch {}
    const local = (lsGet(LS_KEYS.templates) || []).filter(t => t._id !== id);
    lsSet(LS_KEYS.templates, local);
  },
};

// ─── Campaigns Store ──────────────────────────────────────────

const campaignStore = {
  async list() {
    try {
      const res = await api.get('/emailer/campaigns');
      if (res.data.success) {
        lsSet(LS_KEYS.campaigns, res.data.campaigns);
        return res.data.campaigns;
      }
    } catch {}
    return lsGet(LS_KEYS.campaigns) || [];
  },

  async create(data) {
    try {
      const res = await api.post('/emailer/campaigns', data);
      if (res.data.success) {
        const campaigns = lsGet(LS_KEYS.campaigns) || [];
        lsSet(LS_KEYS.campaigns, [res.data.campaign, ...campaigns]);
        return res.data;
      }
    } catch {}
    // Fallback: simulate send locally
    const newC = {
      _id: `local-${nanoid(8)}`,
      ...data,
      status: 'sent',
      recipientCount: (data.recipients || []).length,
      sentCount: (data.recipients || []).length,
      failedCount: 0,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const campaigns = lsGet(LS_KEYS.campaigns) || [];
    lsSet(LS_KEYS.campaigns, [newC, ...campaigns]);
    // Log the sends
    const logs = lsGet(LS_KEYS.logs) || [];
    const newLogs = (data.recipients || []).map(r => ({
      _id: `log-${nanoid(8)}`,
      recipientEmail: r.email,
      recipientName: r.name || '',
      subject: data.subject,
      status: 'sent',
      category: data.category || 'marketing',
      campaign: newC._id,
      createdAt: new Date().toISOString(),
    }));
    lsSet(LS_KEYS.logs, [...newLogs, ...logs]);
    return { success: true, campaign: newC, results: { total: newC.recipientCount, sent: newC.sentCount, failed: 0 } };
  },

  async getDetail(id) {
    try {
      const res = await api.get(`/emailer/campaigns/${id}`);
      if (res.data.success) return res.data;
    } catch {}
    const campaigns = lsGet(LS_KEYS.campaigns) || [];
    const campaign = campaigns.find(c => c._id === id) || {};
    const logs = (lsGet(LS_KEYS.logs) || []).filter(l => l.campaign === id);
    return { campaign, logs };
  },
};

// ─── Contacts Store ───────────────────────────────────────────

const contactStore = {
  async list(params = {}) {
    try {
      const res = await api.get('/emailer/contacts', { params });
      if (res.data.success) {
        lsSet(LS_KEYS.contacts, res.data.contacts);
        return res.data.contacts;
      }
    } catch {}
    let contacts = lsGet(LS_KEYS.contacts) || DEMO_CONTACTS;
    const q = params.search?.toLowerCase();
    if (q) contacts = contacts.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    if (params.source) contacts = contacts.filter(c => c.source === params.source);
    return contacts;
  },
};

// ─── Logs Store ───────────────────────────────────────────────

const logStore = {
  async list(params = {}) {
    try {
      const res = await api.get('/emailer/logs', { params });
      if (res.data.success) return res.data;
    } catch {}
    let logs = lsGet(LS_KEYS.logs) || DEMO_LOGS;
    if (params.status) logs = logs.filter(l => l.status === params.status);
    if (params.category) logs = logs.filter(l => l.category === params.category);
    if (params.search) {
      const q = params.search.toLowerCase();
      logs = logs.filter(l => l.recipientEmail.includes(q) || l.subject.toLowerCase().includes(q));
    }
    const page = parseInt(params.page || 1);
    const limit = parseInt(params.limit || 30);
    const total = logs.length;
    return {
      success: true,
      logs: logs.slice((page - 1) * limit, page * limit),
      pagination: { page, pages: Math.ceil(total / limit), total, limit },
    };
  },
};

// ─── Quota Store ──────────────────────────────────────────────

const quotaStore = {
  async get() {
    try {
      const res = await api.get('/emailer/quota');
      if (res.data.success) {
        lsSet(LS_KEYS.quota, res.data);
        return res.data;
      }
    } catch {}
    const saved = lsGet(LS_KEYS.quota);
    if (saved) return saved;
    // Demo fallback: treat as unlimited (no backend = dev/admin mode)
    return { sentCount: 0, dailyLimit: 'Unlimited', remaining: 999999, isUnlimited: true, date: new Date().toISOString().split('T')[0] };
  },
};

// ─── Analytics Store ──────────────────────────────────────────

const analyticsStore = {
  async get(days = 30) {
    try {
      const res = await api.get(`/emailer/analytics?days=${days}`);
      if (res.data.success) return res.data;
    } catch {}
    // Build analytics from local logs
    const logs = lsGet(LS_KEYS.logs) || DEMO_LOGS;
    const summary = { sent: 0, failed: 0, total: 0 };
    const catMap = {};
    const dayMap = {};
    logs.forEach(l => {
      summary.total++;
      summary[l.status] = (summary[l.status] || 0) + 1;
      catMap[l.category] = (catMap[l.category] || 0) + 1;
      const day = (l.createdAt || '').split('T')[0];
      if (!dayMap[day]) dayMap[day] = { sent: 0, failed: 0 };
      if (l.status === 'sent') dayMap[day].sent++;
      else dayMap[day].failed++;
    });
    return {
      success: true,
      summary,
      byCategory: Object.entries(catMap).map(([_id, count]) => ({ _id, count })),
      dailyActivity: Object.entries(dayMap).sort().map(([_id, v]) => ({ _id, ...v })),
      quotaHistory: [],
    };
  },
};

// ─── Demo Data ────────────────────────────────────────────────

const DEMO_CONTACTS = [
  { id: '1', name: 'Priya Sharma',   email: 'priya@techcorp.in',   experience: '4 yrs', skills: ['React', 'Node.js'], source: 'Job Applicant' },
  { id: '2', name: 'Rahul Mehta',    email: 'rahul@softworks.co',  experience: '6 yrs', skills: ['Python', 'Django'], source: 'Talent Pool' },
  { id: '3', name: 'Anjali Verma',   email: 'anjali@designhub.io', experience: '3 yrs', skills: ['UI/UX', 'Figma'],   source: 'Job Applicant' },
  { id: '4', name: 'Karan Singh',    email: 'karan@cloudsys.dev',  experience: '5 yrs', skills: ['AWS', 'DevOps'],    source: 'Talent Pool' },
  { id: '5', name: 'Sneha Patil',    email: 'sneha@aiventures.in', experience: '2 yrs', skills: ['ML', 'TensorFlow'], source: 'Job Applicant' },
  { id: '6', name: 'Vivek Kumar',    email: 'vivek@byteshift.io',  experience: '7 yrs', skills: ['Java', 'Spring'],   source: 'Job Applicant' },
  { id: '7', name: 'Meera Nair',     email: 'meera@finedge.co',    experience: '4 yrs', skills: ['Go', 'K8s'],        source: 'Talent Pool' },
  { id: '8', name: 'Arjun Joshi',    email: 'arjun@dataviz.com',   experience: '3 yrs', skills: ['D3.js', 'React'],   source: 'Talent Pool' },
];

const DEMO_LOGS = [
  { _id: 'dl1', recipientEmail: 'priya@techcorp.in',   recipientName: 'Priya Sharma', subject: 'Q3 React Developer Outreach',   status: 'sent',   category: 'outreach',  createdAt: new Date(Date.now() - 3600000).toISOString() },
  { _id: 'dl2', recipientEmail: 'rahul@softworks.co',  recipientName: 'Rahul Mehta',  subject: 'Interview Invite: Backend Eng', status: 'sent',   category: 'interview', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { _id: 'dl3', recipientEmail: 'karan@cloudsys.dev',  recipientName: 'Karan Singh',  subject: 'DevOps opportunity at TechCorp',status: 'sent',   category: 'outreach',  createdAt: new Date(Date.now() - 86400000).toISOString() },
  { _id: 'dl4', recipientEmail: 'bad@@invalid',        recipientName: '',             subject: 'Welcome to StackForce!',        status: 'failed', category: 'welcome',   createdAt: new Date(Date.now() - 90000000).toISOString(), error: 'Invalid address' },
  { _id: 'dl5', recipientEmail: 'sneha@aiventures.in', recipientName: 'Sneha Patil',  subject: 'OTP for password reset',        status: 'sent',   category: 'otp',       createdAt: new Date(Date.now() - 172800000).toISOString() },
];

// ─── Bulk send (with localStorage quota tracking) ─────────────

const sendStore = {
  async send({ recipients, subject, bodyHtml, category }) {
    try {
      const res = await api.post('/emailer/send', { recipients, subject, bodyHtml, category });
      if (res.data.success) return res.data;
    } catch {}
    // Simulate send in localStorage
    const quota = lsGet(LS_KEYS.quota) || { sentCount: 0, dailyLimit: 10, remaining: 10, date: new Date().toISOString().split('T')[0] };
    const today = new Date().toISOString().split('T')[0];
    if (quota.date !== today) { quota.sentCount = 0; quota.date = today; quota.remaining = 10; }

    const successCount = Math.min(recipients.length, quota.remaining ?? 10);
    const results = recipients.map((r, i) => ({
      email: typeof r === 'string' ? r : r.email,
      status: i < successCount ? 'sent' : 'failed',
      error: i >= successCount ? 'Daily quota exceeded' : undefined,
    }));

    // Log to localStorage
    const logs = lsGet(LS_KEYS.logs) || [];
    const newLogs = results.map(r => ({
      _id: `log-${nanoid(8)}`,
      recipientEmail: r.email,
      recipientName: recipients.find(rc => (rc.email || rc) === r.email)?.name || '',
      subject,
      status: r.status,
      category: category || 'outreach',
      createdAt: new Date().toISOString(),
    }));
    lsSet(LS_KEYS.logs, [...newLogs, ...logs]);

    // Update quota
    quota.sentCount = (quota.sentCount || 0) + successCount;
    quota.remaining = Math.max(0, (quota.dailyLimit || 10) - quota.sentCount);
    lsSet(LS_KEYS.quota, quota);

    return {
      success: true,
      message: `Sent ${successCount} email(s) [demo mode — connect to backend for real delivery]`,
      successCount,
      failedCount: results.length - successCount,
      results,
    };
  },
};

// ─── Named export ─────────────────────────────────────────────

const store = {
  templates: templateStore,
  campaigns: campaignStore,
  contacts:  contactStore,
  logs:      logStore,
  quota:     quotaStore,
  analytics: analyticsStore,
  send:      sendStore,
};

export default store;
