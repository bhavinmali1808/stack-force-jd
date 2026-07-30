const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    name: {
      type: String,
      required: true,
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
      enum: ['marketing', 'welcome', 'otp', 'interview', 'custom'],
      default: 'custom',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
