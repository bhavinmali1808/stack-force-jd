const mongoose = require('mongoose');

// Condition leaf: { field, operator, value }
// Condition group: { logic: 'AND'|'OR', conditions: [...] }
const conditionSchema = new mongoose.Schema({
  logic:      { type: String, enum: ['AND', 'OR'] },
  conditions: [mongoose.Schema.Types.Mixed],
  // leaf fields
  field:    { type: String },
  operator: { type: String, enum: ['equals','not_equals','contains','gt','lt','exists','not_exists'] },
  value:    mongoose.Schema.Types.Mixed,
}, { _id: false });

const segmentSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  isDynamic:   { type: Boolean, default: true },
  conditions:  conditionSchema,
  userCount:   { type: Number, default: 0 },
  lastSynced:  Date,
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

module.exports = mongoose.model('Segment', segmentSchema);
