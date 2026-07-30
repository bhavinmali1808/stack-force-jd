const express  = require('express');
const router   = express.Router();
const Template = require('../models/Template');
const { protect, notViewer } = require('../middleware/auth');

// Pre-built system templates
const SYSTEM_TEMPLATES = [
  {
    _id: 'sys-welcome', name: 'Welcome', category: 'welcome', isSystem: true,
    variables: ['first_name','verification_link'],
    html: `<h1>Welcome to Resuming.io, {{first_name}}! 🎉</h1>
<p>Your AI-powered career journey starts now. Build a world-class resume in minutes.</p>
<a href="{{verification_link}}" class="btn">Verify Email →</a>`,
  },
  {
    _id: 'sys-verify', name: 'Verify Email', category: 'verify', isSystem: true,
    variables: ['first_name','verification_link'],
    html: `<h1>Verify your email</h1>
<p>Hi <strong>{{first_name}}</strong>, click the button below to verify your Resuming.io account.</p>
<a href="{{verification_link}}" class="btn">Verify Email →</a>
<p style="font-size:12px;color:#64748b;">Link expires in 24 hours.</p>`,
  },
  {
    _id: 'sys-otp', name: 'OTP / Password Reset', category: 'otp', isSystem: true,
    variables: ['first_name','otp'],
    html: `<h1>Reset your password</h1>
<p>Hi <strong>{{first_name}}</strong>, use this OTP to reset your password:</p>
<div class="otp-box"><div class="otp-code">{{otp}}</div></div>
<p style="font-size:12px;color:#64748b;">Expires in 10 minutes. Do not share this code.</p>`,
  },
  {
    _id: 'sys-resume', name: 'Resume Generated', category: 'resume', isSystem: true,
    variables: ['first_name','resume_title','resume_score'],
    html: `<h1>Your resume is ready! 🚀</h1>
<p>Hi <strong>{{first_name}}</strong>, your AI-generated resume <strong>{{resume_title}}</strong> scored <strong>{{resume_score}}/100</strong>.</p>
<a href="https://resuming.io/dashboard" class="btn">View Resume →</a>`,
  },
  {
    _id: 'sys-subscription', name: 'Subscription Success', category: 'subscription', isSystem: true,
    variables: ['first_name','plan'],
    html: `<h1>You're now on {{plan}}! ⚡</h1>
<p>Hi <strong>{{first_name}}</strong>, thank you for upgrading. Enjoy unlimited resume generation and premium features.</p>
<a href="https://resuming.io/dashboard" class="btn">Go to Dashboard →</a>`,
  },
];

// GET /api/templates
router.get('/', protect, async (req, res) => {
  const custom = await Template.find({}).sort({ createdAt: -1 }).lean();
  res.json({ success: true, templates: [...SYSTEM_TEMPLATES, ...custom.map(t => ({ ...t, isSystem: false }))] });
});

// GET /api/templates/:id
router.get('/:id', protect, async (req, res) => {
  if (req.params.id.startsWith('sys-')) {
    const t = SYSTEM_TEMPLATES.find(t => t._id === req.params.id);
    return t ? res.json({ success: true, template: t }) : res.status(404).json({ success: false, message: 'Not found' });
  }
  const template = await Template.findById(req.params.id).lean();
  if (!template) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, template });
});

// POST /api/templates
router.post('/', protect, notViewer, async (req, res) => {
  const template = await Template.create({ ...req.body, createdBy: req.admin._id });
  res.status(201).json({ success: true, template });
});

// PUT /api/templates/:id
router.put('/:id', protect, notViewer, async (req, res) => {
  const template = await Template.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, template });
});

// DELETE /api/templates/:id
router.delete('/:id', protect, notViewer, async (req, res) => {
  await Template.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Template deleted' });
});

// POST /api/templates/:id/duplicate
router.post('/:id/duplicate', protect, notViewer, async (req, res) => {
  let original;
  if (req.params.id.startsWith('sys-')) {
    original = SYSTEM_TEMPLATES.find(t => t._id === req.params.id);
  } else {
    original = await Template.findById(req.params.id).lean();
  }
  if (!original) return res.status(404).json({ success: false, message: 'Not found' });
  const { _id, createdAt, updatedAt, isSystem, ...rest } = original;
  const copy = await Template.create({ ...rest, name: `${rest.name} (Copy)`, createdBy: req.admin._id });
  res.status(201).json({ success: true, template: copy });
});

module.exports = router;
