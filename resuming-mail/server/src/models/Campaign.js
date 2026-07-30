const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  subject:     { type: String, required: true },
  previewText: { type: String, default: '' },
  senderName:  { type: String, default: 'Resuming.io' },
  senderEmail: { type: String, default: 'noreply@resuming.io' },
  replyTo:     { type: String, default: '' },

  templateId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
  segmentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Segment' },
  audienceType:{ type: String, enum: ['all','premium','free','trial','verified','unverified','custom'], default: 'all' },

  status: {
    type: String,
    enum: ['draft', 'scheduled', 'queued', 'sending', 'sent', 'paused', 'cancelled', 'failed'],
    default: 'draft',
  },

  scheduledAt: Date,
  startedAt:   Date,
  completedAt: Date,

  stats: {
    total:         { type: Number, default: 0 },
    queued:        { type: Number, default: 0 },
    sent:          { type: Number, default: 0 },
    delivered:     { type: Number, default: 0 },
    opened:        { type: Number, default: 0 },
    clicked:       { type: Number, default: 0 },
    bounced:       { type: Number, default: 0 },
    softBounced:   { type: Number, default: 0 },
    spam:          { type: Number, default: 0 },
    unsubscribed:  { type: Number, default: 0 },
    failed:        { type: Number, default: 0 },
  },

  // BullMQ job ID for tracking
  jobId:       { type: String },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

campaignSchema.virtual('deliveryRate').get(function () {
  return this.stats.total > 0
    ? ((this.stats.delivered / this.stats.total) * 100).toFixed(1)
    : 0;
});

campaignSchema.virtual('openRate').get(function () {
  return this.stats.delivered > 0
    ? ((this.stats.opened / this.stats.delivered) * 100).toFixed(1)
    : 0;
});

module.exports = mongoose.model('Campaign', campaignSchema);
