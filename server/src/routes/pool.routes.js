/**
 * pool.routes.js — Talent Pool API
 * ─────────────────────────────────────────────────────────────
 * POST /api/pool/presign            → get R2 presigned URLs (production) or local tokens (dev)
 * POST /api/pool/confirm            → after direct R2 upload, confirm and enqueue job
 * PUT  /api/pool/upload/:token      → (dev only) upload file via server, enqueue job
 * GET  /api/pool                    → list pool resumes (paginated)
 * GET  /api/pool/stats              → stats: total, done, skills
 * DELETE /api/pool/:id              → remove from pool
 *
 * POST /api/roles/:roleId/suggestions       → auto-suggest from pool
 * POST /api/roles/:roleId/suggest-add/:poolId → add pool candidate to role
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { protect } = require('../middleware/auth.middleware');
const { enqueuePoolResume } = require('../queue/poolQueue');
const { autoSuggest, addPoolCandidateToRole } = require('../services/autoSuggest');
const PoolResume = require('../models/PoolResume');
const { getPresignedUploadUrl, IS_PRODUCTION, BUCKET } = require('../services/storageService');

const router = express.Router();

// ── Local dev storage setup ────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../../uploads/pool');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// In-memory token store (dev only fallback)
const pendingTokens = new Map();

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const token = req.params.token;
    const ext = path.extname(file.originalname);
    cb(null, `${token}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Unsupported type: ${ext}`));
  },
});

router.use(protect);

// ─────────────────────────────────────────────────────────────
// POST /api/pool/presign
// Production: returns real R2 presigned PUT URLs (browser uploads directly to R2)
// Dev: returns local upload tokens (browser uploads through this server)
// ─────────────────────────────────────────────────────────────
router.post('/presign', async (req, res) => {
  const { files } = req.body;
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'files[] required' });
  }

  try {
    const tokens = await Promise.all(files.map(async (file) => {
      const token = uuidv4();
      const ext = path.extname(file.name).toLowerCase() || '.pdf';
      const r2Key = `pool/${req.company._id}/${token}${ext}`;

      if (IS_PRODUCTION) {
        // Real R2 presigned URL — browser uploads directly to R2, bypassing this server
        const uploadUrl = await getPresignedUploadUrl(r2Key, 'application/octet-stream', 900);
        return {
          token,
          uploadUrl,          // Full R2 URL — use this for the actual PUT
          confirmUrl: `${req.protocol}://${req.get('host')}/api/pool/confirm`,
          r2Key,
          filename: file.name,
          direct: true,       // Frontend: PUT directly to uploadUrl, then POST to confirmUrl
        };
      } else {
        // Dev: upload through this server
        pendingTokens.set(token, { companyId: req.company._id, originalName: file.name });
        setTimeout(() => pendingTokens.delete(token), 15 * 60 * 1000);
        return {
          token,
          uploadUrl: `/api/pool/upload/${token}`,
          filename: file.name,
          direct: false,
        };
      }
    }));

    res.json({ tokens });
  } catch (err) {
    console.error('[Pool Presign Error]', err);
    res.status(500).json({ error: 'Failed to generate upload URLs' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/pool/confirm
// Production only: called by browser AFTER a successful direct R2 upload.
// Creates PoolResume doc and enqueues the parsing job.
// Body: { r2Key, filename, token }
// ─────────────────────────────────────────────────────────────
router.post('/confirm', async (req, res) => {
  const { r2Key, filename } = req.body;
  if (!r2Key || !filename) {
    return res.status(400).json({ error: 'r2Key and filename are required' });
  }

  try {
    const poolResume = await PoolResume.create({
      company: req.company._id,
      resumeUrl: r2Key,           // Store the R2 key, not a local path
      resumeFilename: filename,
      processingStatus: 'queued',
    });

    const jobId = await enqueuePoolResume({
      poolResumeId: poolResume._id.toString(),
      r2Key,                       // Worker will download from R2 using this key
      companyId: req.company._id,
    });

    res.status(202).json({ poolResumeId: poolResume._id, jobId, status: 'queued' });
  } catch (err) {
    console.error('[Pool Confirm Error]', err);
    res.status(500).json({ error: 'Failed to enqueue resume' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/pool/upload/:token  (DEV ONLY — local disk upload)
// ─────────────────────────────────────────────────────────────
router.put('/upload/:token', upload.single('file'), async (req, res) => {
  const { token } = req.params;
  const meta = pendingTokens.get(token);

  if (!meta) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file received' });

  const poolResume = await PoolResume.create({
    company: meta.companyId,
    resumeUrl: `/uploads/pool/${req.file.filename}`,
    resumeFilename: meta.originalName,
    processingStatus: 'queued',
  });

  const jobId = await enqueuePoolResume({
    poolResumeId: poolResume._id.toString(),
    filePath: req.file.path,
    companyId: meta.companyId,
  });

  pendingTokens.delete(token);
  res.status(202).json({ poolResumeId: poolResume._id, jobId, status: 'queued' });
});

// ─────────────────────────────────────────────────────────────
// GET /api/pool?page=1&limit=50&search=&status=done
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { page = 1, limit = 50, search = '', status } = req.query;
  const filter = { company: req.company._id };
  if (status) filter.processingStatus = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { college: { $regex: search, $options: 'i' } },
    ];
  }

  const [resumes, total] = await Promise.all([
    PoolResume.find(filter)
      .select('-resumeText -roleScores')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    PoolResume.countDocuments(filter),
  ]);

  res.json({ resumes, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// ─────────────────────────────────────────────────────────────
// GET /api/pool/stats
// ─────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  const companyId = req.company._id;
  const [total, done, processing, failed, queued] = await Promise.all([
    PoolResume.countDocuments({ company: companyId }),
    PoolResume.countDocuments({ company: companyId, processingStatus: 'done' }),
    PoolResume.countDocuments({ company: companyId, processingStatus: 'processing' }),
    PoolResume.countDocuments({ company: companyId, processingStatus: 'failed' }),
    PoolResume.countDocuments({ company: companyId, processingStatus: 'queued' }),
  ]);

  // Top skills across the pool
  const skillAgg = await PoolResume.aggregate([
    { $match: { company: companyId, processingStatus: 'done' } },
    { $unwind: '$extractedSkills' },
    { $group: { _id: '$extractedSkills', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);

  res.json({
    total, done, processing, failed, queued,
    topSkills: skillAgg.map((s) => ({ skill: s._id, count: s.count })),
  });
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/pool/:id
// ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const resume = await PoolResume.findOneAndDelete({
    _id: req.params.id,
    company: req.company._id,
  });
  if (!resume) return res.status(404).json({ error: 'Not found' });
  try {
    const fullPath = path.join(__dirname, '../../', resume.resumeUrl);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (_) {}
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────
// GET /api/roles/:roleId/suggestions?limit=50&minScore=0
// Auto-suggest pool candidates for a role
// ─────────────────────────────────────────────────────────────
router.get('/roles/:roleId/suggestions', async (req, res) => {
  const { roleId } = req.params;
  const { limit = 50, minScore = 0, mustHaveOnly = 'false' } = req.query;

  const suggestions = await autoSuggest(roleId, req.company._id, {
    limit: Number(limit),
    minScore: Number(minScore),
    mustHaveOnly: mustHaveOnly === 'true',
  });

  res.json({ suggestions, total: suggestions.length, roleId });
});

// ─────────────────────────────────────────────────────────────
// POST /api/roles/:roleId/suggest-add/:poolResumeId
// Add a pool candidate to a role's candidate list
// ─────────────────────────────────────────────────────────────
router.post('/roles/:roleId/suggest-add/:poolResumeId', async (req, res) => {
  const { roleId, poolResumeId } = req.params;
  try {
    const candidate = await addPoolCandidateToRole(poolResumeId, roleId, req.company._id);
    res.status(201).json({ success: true, candidate });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
