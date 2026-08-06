const mongoose = require('mongoose');

const ipPoolSchema = new mongoose.Schema({
  ipAddress: { type: String, required: true, unique: true, trim: true },
  hostname:  { type: String, default: '', trim: true },
  status:    { type: String, enum: ['active', 'warming', 'paused', 'blacklisted'], default: 'warming' },
  warmupDay: { type: Number, default: 1 },
  dailyQuota:{ type: Number, default: 50 },
  sentToday: { type: Number, default: 0 },
  lastResetAt: { type: Date, default: Date.now },
  reputationScore: { type: Number, default: 100 },
  blacklists: [{
    rbl: String,
    listed: Boolean,
    checkedAt: Date,
  }],
}, { timestamps: true });

module.exports = mongoose.model('IPPool', ipPoolSchema);
