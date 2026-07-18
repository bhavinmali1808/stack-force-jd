const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const Role = require('../models/Role');
const Candidate = require('../models/Candidate');
const { parseResume } = require('../services/resumeParser');
const { computeMatchScore } = require('../services/skillMatcher');
const { exportCSV, exportPDF } = require('../services/exportService');
const { analyzeResumeWithAI } = require('../services/aiService');

// Helper for background processing
const processSingleResume = async (filePath, originalname, filename, role, companyId) => {
  try {
    const { text, name, email, phone, extractedSkills: naiveSkills, cgpa: naiveCgpa, yearsOfExperience: naiveExp, college: naiveCollege } = await parseResume(filePath);
    
    let finalData = {};
    if (process.env.GEMINI_API_KEY) {
      try {
        const aiData = await analyzeResumeWithAI(text, role);
        finalData = {
          extractedSkills: aiData.extractedSkills || [],
          matchScore: aiData.aiScore || 0,
          matchedSkills: aiData.matchedSkills || [],
          missingSkills: aiData.missingSkills || [],
          hasMissingMustHave: aiData.hasMissingMustHave || false,
          mustHaveMatched: aiData.mustHaveMatched || [],
          mustHaveMissing: aiData.mustHaveMissing || [],
          niceToHaveMatched: aiData.niceToHaveMatched || [],
          niceToHaveMissing: aiData.niceToHaveMissing || [],
          cgpa: aiData.cgpa,
          yearsOfExperience: aiData.yearsOfExperience,
          college: aiData.college || '',
          aiScore: aiData.aiScore,
          aiSummary: aiData.aiSummary,
          aiReasoning: aiData.aiReasoning,
        };
      } catch (aiErr) {
        console.warn(`AI Analysis failed for ${originalname}, falling back to rule-based. Error:`, aiErr.message);
        finalData = null; 
      }
    }

    if (!finalData) {
      const rules = computeMatchScore(naiveSkills, role.requiredSkills, role.weightedSkills);
      finalData = {
        extractedSkills: naiveSkills,
        matchScore: rules.score,
        matchedSkills: rules.matchedSkills,
        missingSkills: rules.missingSkills,
        hasMissingMustHave: rules.hasMissingMustHave,
        mustHaveMatched: rules.mustHaveMatched,
        mustHaveMissing: rules.mustHaveMissing,
        niceToHaveMatched: rules.niceToHaveMatched,
        niceToHaveMissing: rules.niceToHaveMissing,
        cgpa: naiveCgpa,
        yearsOfExperience: naiveExp,
        college: naiveCollege,
      };
    }

    const resumeUrl = `/uploads/resumes/${filename}`;

    await Candidate.create({
      role: role._id,
      company: companyId,
      name: name || 'Unknown',
      email,
      phone,
      resumeUrl,
      resumeFilename: originalname,
      resumeText: text,
      ...finalData,
    });
    return true;
  } catch (err) {
    console.error(`Error processing ${originalname}: ${err.message}`);
    try { fs.unlinkSync(filePath); } catch (_) {}
    return false;
  }
};

const processAllResumesInBackground = async (filesList, role, companyId) => {
  let successCount = 0;
  for (const file of filesList) {
    const success = await processSingleResume(file.path, file.originalname, file.filename, role, companyId);
    if (success) {
      successCount++;
      if (successCount % 10 === 0) {
        await Role.findByIdAndUpdate(role._id, { $inc: { candidateCount: 10 } });
      }
    }
  }
  if (successCount % 10 !== 0) {
    await Role.findByIdAndUpdate(role._id, { $inc: { candidateCount: successCount % 10 } });
  }
};

/**
 * POST /api/roles/:roleId/candidates/upload
 */
const uploadCandidates = async (req, res) => {
  const role = await Role.findOne({ _id: req.params.roleId, company: req.company._id });
  if (!role) return res.status(404).json({ success: false, message: 'Role not found.' });
  if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded.' });

  let filesToProcess = [];

  for (const file of req.files) {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (ext === '.zip') {
      try {
        const zip = new AdmZip(file.path);
        const zipEntries = zip.getEntries();
        const extractDir = path.join(__dirname, '../../../uploads/resumes');
        
        for (const entry of zipEntries) {
          if (!entry.isDirectory) {
            const entryExt = path.extname(entry.entryName).toLowerCase();
            if (['.pdf', '.docx', '.doc'].includes(entryExt)) {
              // Extract file manually to prevent path traversal issues and get new name
              const uniqueFilename = `resume-${Date.now()}-${Math.round(Math.random() * 1e9)}${entryExt}`;
              const destPath = path.join(extractDir, uniqueFilename);
              fs.writeFileSync(destPath, entry.getData());
              
              filesToProcess.push({
                path: destPath,
                originalname: path.basename(entry.entryName),
                filename: uniqueFilename
              });
            }
          }
        }
        // Cleanup original zip
        try { fs.unlinkSync(file.path); } catch (_) {}
      } catch (err) {
        console.error("ZIP extraction failed:", err);
      }
    } else {
      filesToProcess.push({
        path: file.path,
        originalname: file.originalname,
        filename: file.filename
      });
    }
  }

  // Fire and forget background processing
  processAllResumesInBackground(filesToProcess, role, req.company._id).catch(console.error);

  res.status(202).json({
    success: true,
    message: `Received ${filesToProcess.length} resumes. Processing them in the background.`,
    totalFound: filesToProcess.length
  });
};

/**
 * POST /api/candidates/upload-global
 */
const uploadCandidatesGlobal = async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded.' });

  let filesToProcess = [];

  for (const file of req.files) {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (ext === '.zip') {
      try {
        const zip = new AdmZip(file.path);
        const zipEntries = zip.getEntries();
        const extractDir = path.join(__dirname, '../../../uploads/resumes');
        
        for (const entry of zipEntries) {
          if (!entry.isDirectory) {
            const entryExt = path.extname(entry.entryName).toLowerCase();
            if (['.pdf', '.docx', '.doc'].includes(entryExt)) {
              const uniqueFilename = `resume-${Date.now()}-${Math.round(Math.random() * 1e9)}${entryExt}`;
              const destPath = path.join(extractDir, uniqueFilename);
              fs.writeFileSync(destPath, entry.getData());
              
              filesToProcess.push({
                path: destPath,
                originalname: path.basename(entry.entryName),
                filename: uniqueFilename
              });
            }
          }
        }
        try { fs.unlinkSync(file.path); } catch (_) {}
      } catch (err) {
        console.error("ZIP extraction failed:", err);
      }
    } else {
      filesToProcess.push({
        path: file.path,
        originalname: file.originalname,
        filename: file.filename
      });
    }
  }

  processAllResumesInBackground(filesToProcess, null, req.company._id).catch(console.error);

  res.status(202).json({
    success: true,
    message: `Received ${filesToProcess.length} resumes. Processing them in the background.`,
    totalFound: filesToProcess.length
  });
};

/**
 * GET /api/roles/:roleId/candidates
 */
const getCandidates = async (req, res) => {
  const role = await Role.findOne({ _id: req.params.roleId, company: req.company._id });
  if (!role) return res.status(404).json({ success: false, message: 'Role not found.' });

  const { status, minScore, minCGPA, maxCGPA, minExperience, maxExperience, mustHaveOnly, search, sortBy = 'matchScore', order = 'desc' } = req.query;

  const filter = { role: role._id };
  if (status) filter.status = status;
  if (minScore) filter.matchScore = { $gte: Number(minScore) };
  if (minCGPA || maxCGPA) {
    filter.cgpa = {};
    if (minCGPA) filter.cgpa.$gte = Number(minCGPA);
    if (maxCGPA) filter.cgpa.$lte = Number(maxCGPA);
  }
  if (minExperience) filter.yearsOfExperience = { ...(filter.yearsOfExperience || {}), $gte: Number(minExperience) };
  if (maxExperience) filter.yearsOfExperience = { ...(filter.yearsOfExperience || {}), $lte: Number(maxExperience) };
  if (mustHaveOnly === 'true') filter.hasMissingMustHave = false;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { college: { $regex: search, $options: 'i' } },
    ];
  }

  const sortOrder = order === 'asc' ? 1 : -1;
  const allowed = ['matchScore', 'createdAt', 'name', 'cgpa', 'yearsOfExperience'];
  const sortField = allowed.includes(sortBy) ? sortBy : 'matchScore';

  const candidates = await Candidate.find(filter).sort({ [sortField]: sortOrder }).select('-resumeText');

  res.json({ success: true, role, total: candidates.length, candidates });
};

/**
 * GET /api/candidates
 * Get all past candidates uploaded by the company across all roles
 */
const getAllCompanyCandidates = async (req, res) => {
  const candidates = await Candidate.find({ company: req.company._id }).sort({ createdAt: -1 }).select('-resumeText').populate('role', 'title');
  res.json({ success: true, total: candidates.length, candidates });
};

/**
 * GET /api/candidates/:id
 */
const getCandidateById = async (req, res) => {
  const candidate = await Candidate.findOne({ _id: req.params.id, company: req.company._id }).populate('role', 'title');
  if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found.' });
  res.json({ success: true, candidate });
};

/**
 * PATCH /api/candidates/:id/status
 */
const updateCandidateStatus = async (req, res) => {
  const { status, notes } = req.body;
  const candidate = await Candidate.findOneAndUpdate(
    { _id: req.params.id, company: req.company._id },
    { status, notes },
    { new: true, runValidators: true }
  );
  if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found.' });
  res.json({ success: true, candidate });
};

/**
 * DELETE /api/candidates/:id
 */
const deleteCandidate = async (req, res) => {
  const candidate = await Candidate.findOneAndDelete({ _id: req.params.id, company: req.company._id });
  if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found.' });
  try {
    const filePath = path.join(__dirname, '../../', candidate.resumeUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {}
  await Role.findByIdAndUpdate(candidate.role, { $inc: { candidateCount: -1 } });
  res.json({ success: true, message: 'Candidate deleted.' });
};

/**
 * GET /api/roles/:roleId/analytics
 * Phase 2: Per-role funnel + score distribution + top skills
 */
const getRoleAnalytics = async (req, res) => {
  const role = await Role.findOne({ _id: req.params.roleId, company: req.company._id });
  if (!role) return res.status(404).json({ success: false, message: 'Role not found.' });

  const candidates = await Candidate.find({ role: role._id }).select('status matchScore matchedSkills missingSkills hasMissingMustHave cgpa yearsOfExperience');

  const total = candidates.length;

  // Funnel counts
  const funnel = {
    Applied: 0, Shortlisted: 0, Interview: 0, Selected: 0, Rejected: 0,
  };
  candidates.forEach((c) => { if (funnel[c.status] !== undefined) funnel[c.status]++; });

  // Score distribution
  const high = candidates.filter((c) => c.matchScore >= 80).length;
  const mid = candidates.filter((c) => c.matchScore >= 50 && c.matchScore < 80).length;
  const low = candidates.filter((c) => c.matchScore < 50).length;
  const avgScore = total ? Math.round(candidates.reduce((s, c) => s + c.matchScore, 0) / total) : 0;

  // Must-have compliance
  const mustHaveCompliant = candidates.filter((c) => !c.hasMissingMustHave).length;

  // Top matched / missing skills
  const matchedCount = {};
  const missingCount = {};
  candidates.forEach((c) => {
    (c.matchedSkills || []).forEach((s) => { matchedCount[s] = (matchedCount[s] || 0) + 1; });
    (c.missingSkills || []).forEach((s) => { missingCount[s] = (missingCount[s] || 0) + 1; });
  });
  const topMatchedSkills = Object.entries(matchedCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([skill, count]) => ({ skill, count }));
  const topMissingSkills = Object.entries(missingCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([skill, count]) => ({ skill, count }));

  // CGPA distribution
  const cgpaValues = candidates.map((c) => c.cgpa).filter((v) => v !== null && v !== undefined);
  const avgCGPA = cgpaValues.length ? Math.round(cgpaValues.reduce((s, v) => s + v, 0) / cgpaValues.length * 10) / 10 : null;

  // Experience distribution
  const expValues = candidates.map((c) => c.yearsOfExperience).filter((v) => v !== null && v !== undefined);
  const avgExp = expValues.length ? Math.round(expValues.reduce((s, v) => s + v, 0) / expValues.length * 10) / 10 : null;

  res.json({
    success: true,
    role,
    analytics: {
      total,
      funnel,
      scoreDistribution: { high, mid, low },
      avgScore,
      mustHaveCompliant,
      topMatchedSkills,
      topMissingSkills,
      avgCGPA,
      avgExp,
    },
  });
};

/**
 * GET /api/roles/:roleId/export?format=csv|pdf
 */
const exportCandidates = async (req, res) => {
  const role = await Role.findOne({ _id: req.params.roleId, company: req.company._id });
  if (!role) return res.status(404).json({ success: false, message: 'Role not found.' });

  const candidates = await Candidate.find({ role: role._id }).sort({ matchScore: -1 }).select('-resumeText');
  const format = req.query.format || 'csv';

  if (format === 'pdf') {
    const pdfBuffer = await exportPDF(candidates, role);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="shortlist-${role.title.replace(/\s+/g, '-')}.pdf"`,
    });
    return res.send(pdfBuffer);
  }

  const csv = await exportCSV(candidates, role);
  res.set({
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="shortlist-${role.title.replace(/\s+/g, '-')}.csv"`,
  });
  res.send(csv);
};


module.exports = {
  uploadCandidates, getCandidates, getAllCompanyCandidates, getCandidateById, updateCandidateStatus,
  deleteCandidate, exportCandidates, getRoleAnalytics,
};
