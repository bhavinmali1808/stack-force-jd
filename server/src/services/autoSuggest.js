/**
 * autoSuggest.js — Talent Pool Auto-Suggestion Engine
 * ─────────────────────────────────────────────────────────────
 * Core concept: given a Role, scan the entire company Talent Pool
 * and return ranked candidates using the existing skill scorer.
 *
 * Performance:
 *  - Results are cached per (roleId, companyId) inside each PoolResume doc
 *  - Cache is invalidated when role skills are updated (via roleUpdatedAt check)
 *  - For 5000 resumes, scoring is pure JS (no DB round-trips per resume)
 */

const PoolResume = require('../models/PoolResume');
const Role = require('../models/Role');
const Candidate = require('../models/Candidate');
const { computeMatchScore } = require('./skillMatcher');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get auto-suggested candidates from the Talent Pool for a given role.
 *
 * @param {string} roleId
 * @param {string} companyId
 * @param {{ limit?: number, minScore?: number, mustHaveOnly?: boolean }} opts
 * @returns {Array} Ranked list of pool resume matches
 */
const autoSuggest = async (roleId, companyId, opts = {}) => {
  const { limit = 50, minScore = 0, mustHaveOnly = false } = opts;

  // 1. Load the role
  const role = await Role.findById(roleId).lean();
  if (!role) throw new Error('Role not found');

  const roleUpdatedAt = role.updatedAt?.getTime() || 0;

  // 2. Load all DONE pool resumes for this company
  //    Only fetch the fields we need — skip resumeText (can be huge)
  const poolResumes = await PoolResume.find({
    company: companyId,
    processingStatus: 'done',
  }).select('name email phone extractedSkills yearsOfExperience cgpa college resumeUrl resumeFilename roleScores processingStatus createdAt').lean();

  if (poolResumes.length === 0) return [];

  // 3. Score each resume against this role
  const scored = poolResumes.map((resume) => {
    // Convert roleScores array into a Map for O(1) lookup by roleId
    const roleScoresMap = new Map();
    if (Array.isArray(resume.roleScores)) {
      for (const rs of resume.roleScores) {
        if (rs.roleId) roleScoresMap.set(rs.roleId.toString(), rs);
      }
    }

    const cached = roleScoresMap.get(roleId);
    const isFresh = cached &&
      cached.cachedAt &&
      (Date.now() - new Date(cached.cachedAt).getTime()) < CACHE_TTL_MS &&
      new Date(cached.cachedAt).getTime() > roleUpdatedAt;

    if (isFresh) {
      return {
        _id: resume._id,
        name: resume.name,
        email: resume.email,
        phone: resume.phone,
        college: resume.college,
        yearsOfExperience: resume.yearsOfExperience,
        cgpa: resume.cgpa,
        resumeUrl: resume.resumeUrl,
        resumeFilename: resume.resumeFilename,
        extractedSkills: resume.extractedSkills,
        matchScore: cached.score,
        matchedSkills: cached.matchedSkills,
        missingSkills: cached.missingSkills,
        hasMissingMustHave: cached.hasMissingMustHave,
        fromCache: true,
      };
    }

    // Compute fresh score
    const result = computeMatchScore(
      resume.extractedSkills,
      role.requiredSkills,
      role.weightedSkills,
    );

    return {
      _id: resume._id,
      name: resume.name,
      email: resume.email,
      phone: resume.phone,
      college: resume.college,
      yearsOfExperience: resume.yearsOfExperience,
      cgpa: resume.cgpa,
      resumeUrl: resume.resumeUrl,
      resumeFilename: resume.resumeFilename,
      extractedSkills: resume.extractedSkills,
      matchScore: result.score,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
      hasMissingMustHave: result.hasMissingMustHave,
      fromCache: false,
    };
  });

  // 4. Write new scores to cache (fire and forget — don't block response)
  const toCache = scored.filter((s) => !s.fromCache);
  if (toCache.length > 0) {
    setImmediate(async () => {
      try {
        const bulkOps = toCache.map((s) => ({
          updateOne: {
            filter: { _id: s._id },
            update: {
              $pull: { roleScores: { roleId } },
            },
          },
        }));

        const pushOps = toCache.map((s) => ({
          updateOne: {
            filter: { _id: s._id },
            update: {
              $push: {
                roleScores: {
                  roleId,
                  score: s.matchScore,
                  matchedSkills: s.matchedSkills,
                  missingSkills: s.missingSkills,
                  hasMissingMustHave: s.hasMissingMustHave,
                  cachedAt: new Date(),
                },
              },
            },
          },
        }));

        await PoolResume.bulkWrite(bulkOps);
        await PoolResume.bulkWrite(pushOps);
      } catch (e) {
        // Non-fatal — cache update failed
      }
    });
  }

  // 5. Filter + sort + limit
  let results = scored
    .filter((s) => s.matchScore >= minScore)
    .filter((s) => !mustHaveOnly || !s.hasMissingMustHave)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return results;
};

/**
 * Add a pool resume to a role as a real Candidate.
 * Called when recruiter clicks "Add to role" from the auto-suggest panel.
 */
const addPoolCandidateToRole = async (poolResumeId, roleId, companyId) => {
  const poolResume = await PoolResume.findOne({ _id: poolResumeId, company: companyId }).select('+resumeText');
  if (!poolResume) throw new Error('Pool resume not found');

  const role = await Role.findById(roleId);
  if (!role) throw new Error('Role not found');

  // Check not already added
  const existing = await Candidate.findOne({ company: companyId, role: roleId, email: poolResume.email });
  if (existing && poolResume.email) throw new Error('Candidate already in this role');

  const matchResult = computeMatchScore(
    poolResume.extractedSkills,
    role.requiredSkills,
    role.weightedSkills,
  );

  const candidate = await Candidate.create({
    role: roleId,
    company: companyId,
    name: poolResume.name,
    email: poolResume.email,
    phone: poolResume.phone,
    resumeUrl: poolResume.resumeUrl,
    resumeFilename: poolResume.resumeFilename,
    resumeText: poolResume.resumeText,
    extractedSkills: poolResume.extractedSkills,
    cgpa: poolResume.cgpa,
    yearsOfExperience: poolResume.yearsOfExperience,
    college: poolResume.college,
    matchScore: matchResult.score,
    matchedSkills: matchResult.matchedSkills,
    missingSkills: matchResult.missingSkills,
    hasMissingMustHave: matchResult.hasMissingMustHave,
    mustHaveMatched: matchResult.mustHaveMatched,
    mustHaveMissing: matchResult.mustHaveMissing,
    niceToHaveMatched: matchResult.niceToHaveMatched,
    niceToHaveMissing: matchResult.niceToHaveMissing,
    processingStatus: 'done',
  });

  await Role.findByIdAndUpdate(roleId, { $inc: { candidateCount: 1 } });

  return candidate;
};

module.exports = { autoSuggest, addPoolCandidateToRole };
