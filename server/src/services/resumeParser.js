const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { SKILL_DICTIONARY } = require('./skillDictionary');
const { normalizeSkills } = require('./openSkillsApi');

/**
 * Precompiled Regular Expressions & Static Constants
 */
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(?:(?:\+91|\+1)?[-\s]?)?(?:\d[-\s()]?){10,15}/;

const CGPA_PATTERNS = [
  /cgpa\s*[:\-]?\s*(\d+\.?\d*)\s*(?:\/\s*\d+)?/i,
  /gpa\s*[:\-]?\s*(\d+\.?\d*)\s*(?:\/\s*\d+)?/i,
  /(\d+\.?\d*)\s*\/\s*10\s*cgpa/i,
  /(\d+\.?\d*)\s*\/\s*10/i,
  /(\d+\.?\d*)\s*cgpa/i,
];

const EXPERIENCE_PATTERNS = [
  /(\d+)\+?\s*years?\s*(?:of\s*)?(?:work\s*)?experience/i,
  /experience\s*[:\-]?\s*(\d+)\+?\s*years?/i,
  /(\d+)\s*(?:-\s*\d+)?\s*years?\s*(?:of\s*)?(?:professional\s*)?experience/i,
  /(\d{4})\s*[-\u2013]\s*(?:present|current|now)/i,
];

const SECTION_HEADERS = new Set([
  'resume', 'curriculum vitae', 'cv', 'objective', 'summary', 'profile',
  'contact', 'phone', 'email', 'address', 'skills', 'experience',
  'education', 'projects', 'certifications', 'references', 'overview',
]);

const COLLEGE_KEYWORDS = ['university', 'college', 'institute', 'iit', 'nit', 'bits', 'iiit', 'mit', 'vit', 'srm'];

const COMMON_ROLES = [
  'software engineer', 'frontend developer', 'backend developer',
  'full stack developer', 'data scientist', 'product manager',
  'ui/ux designer', 'devops engineer', 'qa engineer', 'system administrator',
  'business analyst', 'project manager', 'marketing manager', 'sales representative',
  'account executive', 'designer', 'developer', 'engineer', 'manager', 'architect',
  'consultant', 'analyst', 'lead', 'director',
];

// Pre-build index for skills grouped by first character for fast matching
const SKILL_INDEX = new Map();
for (const skill of SKILL_DICTIONARY) {
  const lower = skill.toLowerCase();
  const firstChar = lower[0];
  if (!SKILL_INDEX.has(firstChar)) {
    SKILL_INDEX.set(firstChar, []);
  }
  SKILL_INDEX.get(firstChar).push({ original: skill, lower });
}

// In-memory cache for normalized skills
const skillCache = new Map();

/**
 * Extract raw text from a resume file (PDF or DOCX).
 * Uses async fs.promises.readFile — never blocks the event loop.
 */
const extractText = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = await fs.promises.readFile(filePath);

  if (ext === '.pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === '.txt') {
    return buffer.toString('utf-8');
  }

  throw new Error(`Unsupported file type: ${ext}`);
};

/**
 * Fast skill extraction using character indexing.
 */
const extractSkillsFromText = (text) => {
  const lowerText = text.toLowerCase();
  const paddedText = ` ${lowerText} `;
  const found = new Set();

  for (let i = 0; i < lowerText.length; i++) {
    const char = lowerText[i];
    const skillsForChar = SKILL_INDEX.get(char);
    if (!skillsForChar) continue;

    for (const { original, lower } of skillsForChar) {
      if (lowerText.startsWith(lower, i)) {
        const before = paddedText[i]; // shifted by +1 due to leading space
        const after = paddedText[i + lower.length + 1];
        if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) {
          found.add(original);
        }
      }
    }
  }

  return Array.from(found);
};

/**
 * Cached skill normalization wrapper.
 */
const getNormalizedSkillsCached = async (rawSkills) => {
  if (!rawSkills || rawSkills.length === 0) return [];
  const key = [...rawSkills].sort().join(',');
  if (skillCache.has(key)) {
    return skillCache.get(key);
  }
  const result = await normalizeSkills(rawSkills);
  skillCache.set(key, result);
  return result;
};

/**
 * Single-pass extraction over pre-processed text & lines.
 */
const parseResumeFromText = async (text) => {
  const lowerText = text.toLowerCase();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lowerLines = lines.map((l) => l.toLowerCase());

  // 1. Meta (Email, Phone, Name)
  const emailMatch = text.match(EMAIL_REGEX);
  const phoneMatch = text.match(PHONE_REGEX);

  let nameLine = 'Unknown';
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    const lowerLine = lowerLines[i];
    if (line.length < 2 || line.length > 60) continue;
    if (/@|http|www\.|linkedin|github/i.test(line)) continue;
    if (/^\d/.test(line)) continue;
    if (/\d{5,}/.test(line)) continue;
    if (SECTION_HEADERS.has(lowerLine.replace(/:$/, ''))) continue;
    if (/[|•·|►▸▶→\[\]{}<>]/.test(line)) continue;
    if (!/[a-zA-Z]{2,}/.test(line)) continue;
    nameLine = line;
    break;
  }

  // 2. Extract Sections for targeted parsing (Education, Experience)
  const eduMatch = text.match(/education([\s\S]{0,1500})/i);
  const eduSection = eduMatch ? eduMatch[1] : text;

  const expMatch = text.match(/experience([\s\S]{0,2000})/i);
  const expSection = expMatch ? expMatch[1] : text;

  // 3. CGPA (Search in education section first, fallback to entire text)
  let cgpa = null;
  for (const re of CGPA_PATTERNS) {
    const m = eduSection.match(re) || text.match(re);
    if (m) {
      const val = parseFloat(m[1]);
      if (val > 0 && val <= 10) {
        cgpa = Math.round(val * 10) / 10;
        break;
      }
      if (val > 0 && val <= 4) {
        cgpa = Math.round((val / 4) * 10 * 10) / 10;
        break;
      }
    }
  }

  // 4. Experience Years
  let yearsOfExperience = null;
  const currentYear = new Date().getFullYear();
  for (const re of EXPERIENCE_PATTERNS) {
    const m = expSection.match(re) || text.match(re);
    if (m) {
      const val = parseInt(m[1], 10);
      if (val >= 1990 && val <= currentYear) {
        yearsOfExperience = Math.max(0, currentYear - val);
        break;
      }
      if (val >= 0 && val <= 50) {
        yearsOfExperience = val;
        break;
      }
    }
  }

  // 5. College Extraction (Prioritize education section lines, fallback to top lines)
  let college = '';
  const eduLines = eduSection.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const candidateCollegeLines = [...eduLines, ...lines];

  for (const line of candidateCollegeLines) {
    const lower = line.toLowerCase();
    if (COLLEGE_KEYWORDS.some((kw) => lower.includes(kw)) && line.length > 5 && line.length < 100) {
      college = line.replace(/^\W+|\W+$/g, '').trim();
      break;
    }
  }

  // 6. Current Role (Check top 20 lines)
  let currentRole = 'Unknown Role';
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i];
    if (line.length < 5 || line.length > 60) continue;
    const lower = lowerLines[i];
    if (COMMON_ROLES.some((role) => lower.includes(role))) {
      currentRole = line;
      break;
    }
  }

  // 7. Extract Skills & Normalize in Parallel
  const rawSkills = extractSkillsFromText(text);
  const extractedSkills = await getNormalizedSkillsCached(rawSkills);

  return {
    text,
    name: nameLine,
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0].trim() : '',
    extractedSkills,
    cgpa,
    yearsOfExperience,
    college,
    currentRole,
  };
};

/**
 * Main parseResume entrypoint.
 */
const parseResume = async (filePath) => {
  const text = await extractText(filePath);
  return parseResumeFromText(text);
};

module.exports = { parseResume, extractSkillsFromText, extractText };


