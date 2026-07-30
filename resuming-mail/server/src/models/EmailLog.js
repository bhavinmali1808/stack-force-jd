const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  campaign:       { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
  recipientEmail: { type: String, required: true, index: true },
  recipientName:  { type: String, default: '' },

  // Personalization variables snapshot
  variables:      mongoose.Schema.Types.Mixed,

  status: {
    type: String,
    enum: ['queued','sending','delivered','opened','clicked','failed','bounced','soft_bounced','spam','unsubscribed'],
    default: 'queued',
    index: true,
  },

  // Tracking IDs
  trackingId:   { type: String, unique: true, sparse: true },
  messageId:    { type: String },

  // Timestamps
  sentAt:         Date,
  deliveredAt:    Date,
  openedAt:       Date,
  clickedAt:      Date,
  bouncedAt:      Date,
  unsubscribedAt: Date,

  // Click tracking (array of click events)
  clicks: [{
    url:        String,
    clickedAt:  Date,
    userAgent:  String,
    ip:         String,
    country:    String,
    city:       String,
  }],

  // Open tracking
  opens: [{
    openedAt: Date,
    userAgent: String,
    ip:        String,
    country:   String,
    device:    String,
    browser:   String,
  }],

  bounceType:   { type: String, enum: ['hard','soft','spam',''], default: '' },
  bounceReason: { type: String, default: '' },
  error:        { type: String, default: '' },

  // BullMQ job
  jobId:        { type: String },
  attempts:     { type: Number, default: 0 },
}, { timestamps: true });

// Compound indexes for analytics queries
emailLogSchema.index({ campaign: 1, status: 1 });
emailLogSchema.index({ recipientEmail: 1, createdAt: -1 });
emailLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
