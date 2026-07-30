const mongoose = require('mongoose');

const emailCampaignSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
    },
    bodyHtml: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['marketing', 'outreach', 'newsletter', 'announcement', 'interview', 'custom'],
      default: 'marketing',
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'sent', 'paused', 'failed'],
      default: 'draft',
    },
    // Recipients snapshot at send time
    recipientCount: {
      type: Number,
      default: 0,
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    failedCount: {
      type: Number,
      default: 0,
    },
    openCount: {
      type: Number,
      default: 0,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailTemplate',
      default: null,
    },
  },
  { timestamps: true }
);

emailCampaignSchema.index({ company: 1, createdAt: -1 });
emailCampaignSchema.index({ status: 1 });

module.exports = mongoose.model('EmailCampaign', emailCampaignSchema);
