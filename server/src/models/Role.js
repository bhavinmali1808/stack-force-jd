const mongoose = require('mongoose');

const weightedSkillSchema = new mongoose.Schema(
  {
    skill: { type: String, required: true, trim: true },
    type: { type: String, enum: ['must-have', 'nice-to-have'], default: 'must-have' },
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Role title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    // Phase 2: weighted skills (must-have / nice-to-have)
    weightedSkills: {
      type: [weightedSkillSchema],
      default: [],
    },
    // Derived from weightedSkills — kept for backward compat & fast querying
    requiredSkills: {
      type: [String],
      default: [],
    },
    experienceLevel: {
      type: String,
      default: 'Mid',
    },
    minExperience: { type: Number, default: 0 },
    maxExperience: { type: Number, default: 50 },
    salaryRange: { type: String, default: 'Not Disclosed' },
    education: { type: String, default: 'Graduate' },
    industry: { type: String, default: 'IT Services' },
    department: { type: String, default: 'Engineering' },
    roleCategory: { type: String, default: 'Software Development' },
    employmentType: { type: String, default: 'Full Time' },
    applyUrl: { type: String, default: '' },
    vacancies: { type: Number, default: 1 },
    jobId: { type: String, default: '' },
    location: {
      type: String,
      trim: true,
      default: 'Remote',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    candidateCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Sync requiredSkills from weightedSkills before save
roleSchema.pre('save', function (next) {
  if (this.isModified('weightedSkills')) {
    this.requiredSkills = this.weightedSkills.map((ws) => ws.skill.toLowerCase().trim());
  }
  next();
});

module.exports = mongoose.model('Role', roleSchema);
