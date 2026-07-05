const mongoose = require('mongoose');

const emailAccountSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    emailAddress: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      enum: ['gmail', 'outlook'],
      required: true,
    },
    appPassword: {
      type: String,
      required: true, // Only storing app passwords since this is an MVP
    },
    dailySendLimit: {
      type: Number,
      default: 50,
    },
    status: {
      type: String,
      enum: ['Active', 'Error', 'Disconnected'],
      default: 'Active',
    },
    plan: {
      type: String,
      enum: ['Free', 'Pro'],
      default: 'Free',
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailAccount', emailAccountSchema);
