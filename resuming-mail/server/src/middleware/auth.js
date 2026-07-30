const jwt  = require('jsonwebtoken');
const Admin = require('../models/Admin');

// ── Protect: require valid admin JWT ──────────
const protect = async (req, res, next) => {
  let token = req.cookies?.adminToken;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin   = await Admin.findById(decoded.id).select('-password');
    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: 'Admin account inactive or not found' });
    }
    req.admin = admin;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ── Role guard: only superadmin ───────────────
const superAdminOnly = (req, res, next) => {
  if (req.admin?.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Superadmin access required' });
  }
  next();
};

// ── Viewer read-only: block writes ────────────
const notViewer = (req, res, next) => {
  if (req.admin?.role === 'viewer') {
    return res.status(403).json({ success: false, message: 'Viewer accounts are read-only' });
  }
  next();
};

const signToken = (adminId) =>
  jwt.sign({ id: adminId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

module.exports = { protect, superAdminOnly, notViewer, signToken };
