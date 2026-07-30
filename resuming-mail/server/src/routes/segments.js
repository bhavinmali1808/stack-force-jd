const express  = require('express');
const router   = express.Router();
const Segment  = require('../models/Segment');
const { protect, notViewer } = require('../middleware/auth');
const { countAudience, buildCondition } = require('../services/segmentService');

// GET /api/segments
router.get('/', protect, async (req, res) => {
  const segments = await Segment.find({}).sort({ createdAt: -1 }).lean();
  res.json({ success: true, segments });
});

// GET /api/segments/:id
router.get('/:id', protect, async (req, res) => {
  const segment = await Segment.findById(req.params.id).lean();
  if (!segment) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, segment });
});

// POST /api/segments
router.post('/', protect, notViewer, async (req, res) => {
  const segment = await Segment.create({ ...req.body, createdBy: req.admin._id });
  res.status(201).json({ success: true, segment });
});

// PUT /api/segments/:id
router.put('/:id', protect, notViewer, async (req, res) => {
  const segment = await Segment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, segment });
});

// DELETE /api/segments/:id
router.delete('/:id', protect, notViewer, async (req, res) => {
  await Segment.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Segment deleted' });
});

// POST /api/segments/:id/count — preview audience size
router.post('/:id/count', protect, async (req, res) => {
  const segment = await Segment.findById(req.params.id);
  if (!segment) return res.status(404).json({ success: false, message: 'Not found' });
  const count = await countAudience(null, segment);
  segment.userCount = count;
  segment.lastSynced = new Date();
  await segment.save();
  res.json({ success: true, count });
});

// POST /api/segments/preview — test condition without saving
router.post('/preview', protect, async (req, res) => {
  const { conditions, audienceType } = req.body;
  const count = await countAudience(audienceType, conditions ? { conditions } : null);
  res.json({ success: true, count });
});

module.exports = router;
