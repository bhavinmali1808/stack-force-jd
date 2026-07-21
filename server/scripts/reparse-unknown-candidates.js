/**
 * reparse-unknown-candidates.js
 * ─────────────────────────────────────────────────────────────────────
 * One-time migration: finds all Candidates with name='Unknown' (or null)
 * whose resume file still exists on disk, re-parses them with the
 * improved resumeParser.js, and updates the DB record.
 *
 * Run from the server/ directory:
 *   node scripts/reparse-unknown-candidates.js
 *
 * Dry-run mode (no DB writes):
 *   DRY_RUN=true node scripts/reparse-unknown-candidates.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const Candidate = require('../src/models/Candidate');
const { parseResume } = require('../src/services/resumeParser');
const { computeMatchScore } = require('../src/services/skillMatcher');
const Role = require('../src/models/Role');

const DRY_RUN = process.env.DRY_RUN === 'true';
const CONCURRENCY = 6; // parallel re-parse workers

// ── Resolve upload dir ──────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../../uploads/resumes');

async function reparseSingle(candidate) {
  // Build the file path from the stored resumeUrl
  const resumeUrl = candidate.resumeUrl || '';
  // resumeUrl is like "/uploads/resumes/resume-123.pdf"
  const filename = path.basename(resumeUrl);
  const filePath = path.join(UPLOAD_DIR, filename);

  if (!filename || !fs.existsSync(filePath)) {
    return { _id: candidate._id, status: 'skip', reason: 'file not found' };
  }

  try {
    const parsed = await parseResume(filePath);

    // If we couldn't improve the name, skip to avoid overwriting something useful
    if (!parsed.name || parsed.name === 'Unknown') {
      return { _id: candidate._id, status: 'skip', reason: 'name still unknown after re-parse' };
    }

    // Re-compute skill match if the candidate has a role with weightedSkills
    let matchFields = {};
    if (candidate.role) {
      try {
        const role = await Role.findById(candidate.role).lean();
        if (role?.weightedSkills?.length) {
          const result = computeMatchScore(
            parsed.extractedSkills,
            role.requiredSkills || [],
            role.weightedSkills || []
          );
          matchFields = {
            matchScore: result.score,
            matchedSkills: result.matchedSkills,
            missingSkills: result.missingSkills,
            hasMissingMustHave: result.hasMissingMustHave,
            mustHaveMatched: result.mustHaveMatched,
            mustHaveMissing: result.mustHaveMissing,
            niceToHaveMatched: result.niceToHaveMatched,
            niceToHaveMissing: result.niceToHaveMissing,
          };
        }
      } catch (_) {}
    }

    const update = {
      name: parsed.name,
      email: parsed.email || candidate.email,
      phone: parsed.phone || candidate.phone,
      extractedSkills: parsed.extractedSkills?.length ? parsed.extractedSkills : candidate.extractedSkills,
      cgpa: parsed.cgpa ?? candidate.cgpa,
      yearsOfExperience: parsed.yearsOfExperience ?? candidate.yearsOfExperience,
      college: parsed.college || candidate.college,
      currentRole: parsed.currentRole || candidate.currentRole,
      linkedinUrl: parsed.linkedin || candidate.linkedinUrl,
      githubUrl: parsed.github || candidate.githubUrl,
      ...matchFields,
    };

    if (!DRY_RUN) {
      await Candidate.findByIdAndUpdate(candidate._id, { $set: update });
    }

    return { _id: candidate._id, status: 'updated', name: parsed.name, skills: parsed.extractedSkills?.length };
  } catch (err) {
    return { _id: candidate._id, status: 'error', reason: err.message };
  }
}

async function main() {
  console.log(`\n🔄  Re-parse Unknown Candidates${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  MongoDB connected');

  // Find all candidates with unknown name
  const candidates = await Candidate.find({
    $or: [{ name: 'Unknown' }, { name: null }, { name: '' }],
  }).select('_id name resumeUrl role email phone extractedSkills cgpa yearsOfExperience college currentRole linkedinUrl githubUrl').lean();

  console.log(`📋  Found ${candidates.length} candidates with missing name\n`);

  if (candidates.length === 0) {
    console.log('✨  Nothing to re-process. All candidates have names!');
    await mongoose.disconnect();
    return;
  }

  // Process in parallel batches
  let updated = 0, skipped = 0, errors = 0;
  let index = 0;

  const worker = async () => {
    while (index < candidates.length) {
      const c = candidates[index++];
      const result = await reparseSingle(c);

      if (result.status === 'updated') {
        updated++;
        console.log(`  ✓ [${updated}] ${result._id} → "${result.name}" (${result.skills} skills)`);
      } else if (result.status === 'skip') {
        skipped++;
        if (skipped <= 5) console.log(`  ⏭  skip: ${result._id} (${result.reason})`);
        if (skipped === 6) console.log(`  ⏭  (suppressing further skip messages...)`);
      } else {
        errors++;
        console.log(`  ✗  error: ${result._id} — ${result.reason}`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅  Updated : ${updated}`);
  console.log(`⏭   Skipped : ${skipped} (file missing or name still unknown)`);
  console.log(`✗   Errors  : ${errors}`);
  console.log(DRY_RUN ? '\n[DRY RUN] No DB changes were made.' : '\n🎉  Done! Refresh your browser to see updated names.');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
