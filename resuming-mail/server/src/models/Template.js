const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  type:    { type: String, required: true }, // heading, paragraph, image, button, divider, columns, spacer, html, social, footer
  content: mongoose.Schema.Types.Mixed,
  styles:  mongoose.Schema.Types.Mixed,
  order:   { type: Number, default: 0 },
}, { _id: false });

const templateSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  category:   {
    type: String,
    enum: ['welcome','verify','password-reset','otp','resume','subscription','invoice','festival','newsletter','announcement','maintenance','custom'],
    default: 'custom',
  },
  html:       { type: String, default: '' }, // compiled HTML
  blocks:     [blockSchema],               // drag-drop JSON
  previewUrl: { type: String, default: '' },
  thumbnail:  { type: String, default: '' },
  isSystem:   { type: Boolean, default: false },
  variables:  [{ type: String }],          // e.g. ['first_name','otp']
  usageCount: { type: Number, default: 0 },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

module.exports = mongoose.model('Template', templateSchema);
