const mongoose = require('mongoose');

const suppressionSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true, lowercase: true },
  reason:   { type: String, enum: ['unsubscribed','bounce','spam','manual','import'], default: 'manual' },
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  note:     { type: String, default: '' },
  suppressedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('SuppressionList', suppressionSchema);
