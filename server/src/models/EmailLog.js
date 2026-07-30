const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    recipientEmail: {
      type: String,
      required: true,
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
      enum: ['sent', 'failed', 'queued'],
      default: 'sent',
    },
    error: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: 'outreach',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailLog', emailLogSchema);
