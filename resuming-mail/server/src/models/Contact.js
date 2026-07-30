const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  firstName:   { type: String, default: '', trim: true },
  lastName:    { type: String, default: '', trim: true },
  plan:        { type: String, enum: ['free','trial','premium','enterprise'], default: 'free' },
  resumeScore: { type: Number, default: 0 },
  resumeTitle: { type: String, default: '' },
  isVerified:  { type: Boolean, default: false },
  hasResume:   { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true },
  isUnsubscribed: { type: Boolean, default: false },
  tags:        [String],
  metadata:    mongoose.Schema.Types.Mixed,
  source:      { type: String, enum: ['import','api','resuming_io','manual'], default: 'manual' },
  lastEmailSentAt: Date,
  emailCount:  { type: Number, default: 0 },
  joinedAt:    { type: Date, default: Date.now },
}, { timestamps: true });

contactSchema.index({ email: 1 });
contactSchema.index({ plan: 1 });
contactSchema.index({ isVerified: 1 });
contactSchema.index({ hasResume: 1 });
contactSchema.index({ tags: 1 });
contactSchema.index({ joinedAt: -1 });

module.exports = mongoose.model('Contact', contactSchema);
