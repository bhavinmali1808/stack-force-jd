const mongoose = require('mongoose');

const emailQuotaSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD format
      required: true,
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    dailyLimit: {
      type: Number,
      default: 10,
    },
  },
  { timestamps: true }
);

emailQuotaSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('EmailQuota', emailQuotaSchema);
