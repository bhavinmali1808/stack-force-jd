/**
 * storage.routes.js — Unified file upload handler
 * ─────────────────────────────────────────────────────────────
 * DEVELOPMENT flow (local disk):
 *   1. POST /api/storage/presign  → server generates token, returns local upload URL
 *   2. PUT  /api/storage/upload/:token → file saved to disk, job enqueued
 *
 * PRODUCTION flow (Cloudflare R2):
 *   1. POST /api/storage/presign  → server generates real R2 presigned PUT URL
 *   2. Client uploads DIRECTLY to R2 (bypasses backend — true presigned upload)
 *   3. Client POSTs /api/storage/confirm/:token → job enqueued
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { protect } = require('../middleware/auth.middleware');
const { enqueueResume } = require('../queue/queueFactory');
const { getPresignedUploadUrl, IS_PRODUCTION, BUCKET } = require('../services/storageService');
const Candidate = require('../models/Candidate');
const Role = require('../models/Role');

const router = express.Router();

// ── Token store: in-memory map of token → metadata ──────────
// In production this would be Redis with a TTL.
const pendingTokens = new Map();

// ── Dev-only: multer disk storage ─────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../../uploads/resumes');
if (!IS_PRODUCTION && !fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.token}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${ext}`));
  },
});

// ─────────────────────────────────────────────────────────────
// POST /api/storage/presign
// Body: { roleId, files: [{ name, size }] }
// Returns: [{ token, uploadUrl, filename, direct }]
//   direct=true means client uploads straight to R2 (production)
//   direct=false means client uploads to our server (dev)
// ─────────────────────────────────────────────────────────────
router.post('/presign', protect, async (req, res) => {
  const { roleId, files } = req.body;

  if (!roleId || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'roleId and files[] are required' });
  }

  const role = await Role.findOne({ _id: roleId, company: req.company._id });
  if (!role) return res.status(404).json({ error: 'Role not found' });

  const tokens = await Promise.all(files.map(async (file) => {
    const token = uuidv4();
    const ext = path.extname(file.name).toLowerCase() || '.pdf';
    const r2Key = `resumes/${req.company._id}/${token}${ext}`;

    const meta = {
      roleId,
      companyId: req.company._id,
      originalName: file.name,
      requiredSkills: role.requiredSkills,
      weightedSkills: role.weightedSkills,
      r2Key,
    };
    pendingTokens.set(token, meta);
    setTimeout(() => pendingTokens.delete(token), 15 * 60 * 1000);

    if (IS_PRODUCTION) {
      // Real presigned URL — client uploads directly to R2
      const presignedUrl = await getPresignedUploadUrl(r2Key, 'application/octet-stream');
      return { token, uploadUrl: presignedUrl, confirmUrl: `/api/storage/confirm/${token}`, filename: file.name, direct: true };
    } else {
      // Dev: upload to our local server
      return { token, uploadUrl: `/api/storage/upload/${token}`, filename: file.name, direct: false };
    }
  }));

  res.json({ tokens });
});

// ─────────────────────────────────────────────────────────────
// PUT /api/storage/upload/:token (DEV ONLY)
// Receives the actual file, saves to disk, creates Candidate, enqueues job.
// ─────────────────────────────────────────────────────────────
router.put('/upload/:token', protect, upload.single('file'), async (req, res) => {
  const { token } = req.params;
  const meta = pendingTokens.get(token);

  if (!meta) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Invalid or expired upload token' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file received' });

  const candidate = await Candidate.create({
    role: meta.roleId,
    company: meta.companyId.toString(),
    resumeUrl: `/uploads/resumes/${req.file.filename}`,
    resumeFilename: meta.originalName,
    processingStatus: 'queued',
  });

  const jobId = await enqueueResume({
    candidateId: candidate._id.toString(),
    filePath: req.file.path,
    resumeKey: null, // local path used in dev
    roleId: meta.roleId,
    requiredSkills: meta.requiredSkills,
    weightedSkills: meta.weightedSkills,
  });

  pendingTokens.delete(token);
  res.status(202).json({ candidateId: candidate._id, jobId, status: 'queued' });
});

// ─────────────────────────────────────────────────────────────
// POST /api/storage/confirm/:token (PRODUCTION ONLY)
// Called after client has uploaded directly to R2.
// Creates Candidate doc and enqueues the parsing job.
// ─────────────────────────────────────────────────────────────
router.post('/confirm/:token', protect, async (req, res) => {
  const { token } = req.params;
  const meta = pendingTokens.get(token);

  if (!meta) return res.status(400).json({ error: 'Invalid or expired upload token' });

  const candidate = await Candidate.create({
    role: meta.roleId,
    company: meta.companyId.toString(),
    resumeUrl: meta.r2Key,
    resumeFilename: meta.originalName,
    processingStatus: 'queued',
  });

  const jobId = await enqueueResume({
    candidateId: candidate._id.toString(),
    filePath: null,
    resumeKey: meta.r2Key, // R2 object key
    roleId: meta.roleId,
    requiredSkills: meta.requiredSkills,
    weightedSkills: meta.weightedSkills,
  });

  pendingTokens.delete(token);
  res.status(202).json({ candidateId: candidate._id, jobId, status: 'queued' });
});

module.exports = router;
