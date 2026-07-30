const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailCampaign',
      default: null,
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    recipientName: {
      type: String,
      default: '',
    },
    subject: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['sent', 'failed', 'queued', 'bounced', 'unsubscribed'],
      default: 'sent',
    },
    error: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['otp', 'welcome', 'interview', 'outreach', 'marketing', 'custom'],
      default: 'outreach',
    },
    messageId: {
      type: String,
      default: '',
    },
    openedAt: {
      type: Date,
      default: null,
    },
    clickedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

emailLogSchema.index({ sender: 1, createdAt: -1 });
emailLogSchema.index({ campaign: 1 });
emailLogSchema.index({ recipientEmail: 1 });
emailLogSchema.index({ status: 1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
