const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema(
  {
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    name: {
      type: String,
      trim: true,
      default: 'Unknown',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    resumeUrl: {
      type: String,
      required: true,
    },
    resumeFilename: {
      type: String,
      required: true,
    },
    resumeText: {
      type: String,
      default: '',
      select: false,
    },
    extractedSkills: {
      type: [String],
      default: [],
    },
    matchScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    matchedSkills: {
      type: [String],
      default: [],
    },
    missingSkills: {
      type: [String],
      default: [],
    },
    // Phase 3 placeholder — AI will populate these
    aiSummary: {
      type: String,
      default: null,
    },
    aiScore: {
      type: Number,
      default: null,
    },
    aiReasoning: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'],
      default: 'Applied',
    },
    notes: {
      type: String,
      default: '',
    },
    // Phase 2: extracted structured fields
    yearsOfExperience: {
      type: Number,
      default: null,
    },
    cgpa: {
      type: Number,
      default: null,
    },
    college: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },
    education: {
      type: String,
      default: '',
    },
    currentRole: {
      type: String,
      default: 'Unknown Role',
    },
    // Phase 2: flag if any must-have skills are missing (for UI warning)
    hasMissingMustHave: {
      type: Boolean,
      default: false,
    },
    mustHaveMatched: { type: [String], default: [] },
    mustHaveMissing: { type: [String], default: [] },
    niceToHaveMatched: { type: [String], default: [] },
    niceToHaveMissing: { type: [String], default: [] },
    // Phase 4: LinkedIn Scraping Data
    linkedinData: {
      type: Object,
      default: null,
    },
    // ── Distributed Architecture: Processing Status ─────────────
    // Tracks the resume through the async processing pipeline:
    //   queued → processing → done / failed
    // Equivalent to a DynamoDB status field polled by the UI.
    processingStatus: {
      type: String,
      enum: ['queued', 'processing', 'done', 'failed'],
      default: 'done', // legacy candidates (synchronous upload) are already done
    },
  },
  { timestamps: true }
);

// Index for fast sorting by score per role
candidateSchema.index({ role: 1, matchScore: -1 });

// MongoDB $text index — simulates Elasticsearch full-text search.
// Allows queries like: Candidate.find({ $text: { $search: 'react node.js' } })
candidateSchema.index({ resumeText: 'text', name: 'text' });

module.exports = mongoose.model('Candidate', candidateSchema);
