const mongoose = require('mongoose');

// ── Bounce List ───────────────────────────────
const bounceSchema = new mongoose.Schema({
  email:       { type: String, required: true, unique: true, lowercase: true },
  bounceType:  { type: String, enum: ['hard', 'soft', 'spam'], default: 'hard' },
  campaign:    { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  reason:      { type: String, default: '' },
  suppressedAt:{ type: Date, default: Date.now },
}, { timestamps: true });

bounceSchema.index({ email: 1 });

module.exports = mongoose.model('BounceList', bounceSchema);
