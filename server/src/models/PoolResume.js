/**
 * PoolResume.js — Talent Pool Document
 * ─────────────────────────────────────────────────────────────
 * A resume in the company's Talent Pool is NOT tied to any role.
 * It can match ANY role at any time via the auto-suggest engine.
 *
 * Lifecycle:
 *   upload → queued → processing (Python parser) → done
 *   → auto-scored against all company roles
 */

const mongoose = require('mongoose');

const roleScoreSchema = new mongoose.Schema(
  {
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    score: { type: Number, default: 0 },
    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    hasMissingMustHave: { type: Boolean, default: false },
    cachedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const poolResumeSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // File info
    resumeUrl: { type: String, required: true },
    resumeFilename: { type: String, required: true },

    // Extracted by Python parser
    name: { type: String, default: 'Unknown', trim: true },
    email: { type: String, default: '', lowercase: true, trim: true },
    phone: { type: String, default: '' },
    extractedSkills: { type: [String], default: [] },
    resumeText: { type: String, default: '', select: false },
    yearsOfExperience: { type: Number, default: null },
    monthsOfExperience: { type: Number, default: null },
    cgpa: { type: Number, default: null },
    college: { type: String, default: '' },
    currentRole: { type: String, default: 'Unknown Role' },
    sections: { type: Object, default: {} }, // detected resume sections

    // Processing status
    processingStatus: {
      type: String,
      enum: ['queued', 'processing', 'done', 'failed'],
      default: 'queued',
    },
    parseError: { type: String, default: null },

    // Auto-suggest cache: scores against each role
    // { roleId, score, matchedSkills, missingSkills, cachedAt }
    roleScores: { type: [roleScoreSchema], default: [] },
  },
  { timestamps: true }
);

// Fast lookup: all pool resumes for a company, sorted by skill count
poolResumeSchema.index({ company: 1, processingStatus: 1 });
poolResumeSchema.index({ company: 1, extractedSkills: 1 });

// MongoDB text index for full-text search in the pool
poolResumeSchema.index({ resumeText: 'text', name: 'text' });

module.exports = mongoose.model('PoolResume', poolResumeSchema);
