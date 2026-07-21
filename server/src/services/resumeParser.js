const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { SKILL_DICTIONARY } = require('./skillDictionary');

/**
 * Extract raw text from a resume file (PDF or DOCX).
 * Uses async fs.promises.readFile — never blocks the event loop.
 */
const extractText = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = await fs.promises.readFile(filePath); // ← non-blocking

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
 * Extract name, email, phone from raw text.
 * Improved name heuristic — skips section headers, URLs, lines with too many digits.
 */
const SECTION_HEADERS = new Set([
  'resume', 'curriculum vitae', 'cv', 'objective', 'summary', 'profile',
  'contact', 'phone', 'email', 'address', 'skills', 'experience',
  'education', 'projects', 'certifications', 'references', 'overview',
]);

const extractMeta = (text) => {
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(\+?[\d\s\-().]{10,15})/);

  // Look through top 10 non-empty lines for the candidate name.
  // A name line is typically short, has no @ or URLs, isn't a section header,
  // and doesn't start with a digit or common label.
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let nameLine = 'Unknown';
  for (const line of lines.slice(0, 10)) {
    if (line.length < 2 || line.length > 60) continue;              // too short or too long
    if (/@|http|www\.|linkedin|github/i.test(line)) continue;       // URL / email
    if (/^\d/.test(line)) continue;                                  // starts with digit
    if (/\d{5,}/.test(line)) continue;                              // mostly numbers
    if (SECTION_HEADERS.has(line.toLowerCase().replace(/:$/, ''))) continue; // header keyword
    if (/[|•·|►▸▶→\[\]{}<>]/.test(line)) continue;                // bullet/symbol lines
    // Must contain at least one letter word (not just punctuation)
    if (!/[a-zA-Z]{2,}/.test(line)) continue;
    nameLine = line;
    break;
  }

  return {
    name: nameLine,
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0].trim() : '',
  };
};

/**
 * Phase 2: Extract CGPA from text.
 */
const extractCGPA = (text) => {
  const patterns = [
    /cgpa\s*[:\-]?\s*(\d+\.?\d*)\s*(?:\/\s*\d+)?/i,
    /gpa\s*[:\-]?\s*(\d+\.?\d*)\s*(?:\/\s*\d+)?/i,
    /(\d+\.?\d*)\s*\/\s*10\s*cgpa/i,
    /(\d+\.?\d*)\s*\/\s*10/i,
    /(\d+\.?\d*)\s*cgpa/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const val = parseFloat(m[1]);
      if (val > 0 && val <= 10) return Math.round(val * 10) / 10;
      if (val > 0 && val <= 4) return Math.round((val / 4) * 10 * 10) / 10;
    }
  }
  return null;
};

/**
 * Phase 2: Extract years of experience from text.
 */
const extractExperience = (text) => {
  const patterns = [
    /(\d+)\+?\s*years?\s*(?:of\s*)?(?:work\s*)?experience/i,
    /experience\s*[:\-]?\s*(\d+)\+?\s*years?/i,
    /(\d+)\s*(?:-\s*\d+)?\s*years?\s*(?:of\s*)?(?:professional\s*)?experience/i,
    /(\d{4})\s*[-\u2013]\s*(?:present|current|now)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const val = parseInt(m[1]);
      if (val >= 1990 && val <= 2024) return Math.max(0, new Date().getFullYear() - val);
      if (val >= 0 && val <= 50) return val;
    }
  }
  return null;
};

/**
 * Phase 2: Extract college/university name from text.
 */
const extractCollege = (text) => {
  const lines = text.split('\n').map((l) => l.trim());
  const keywords = ['university', 'college', 'institute', 'iit', 'nit', 'bits', 'iiit', 'mit', 'vit', 'srm'];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (keywords.some((kw) => lower.includes(kw)) && line.length > 5 && line.length < 100) {
      return line.replace(/^\W+|\W+$/g, '').trim();
    }
  }
  return '';
};

/**
 * Extract the candidate's current/most-recent job title from the first 20 lines.
 * Mirrors the Python parser's extract_current_role() logic.
 */
const COMMON_ROLES = [
  'software engineer', 'frontend developer', 'backend developer',
  'full stack developer', 'data scientist', 'product manager',
  'ui/ux designer', 'devops engineer', 'qa engineer', 'system administrator',
  'business analyst', 'project manager', 'marketing manager', 'sales representative',
  'account executive', 'designer', 'developer', 'engineer', 'manager', 'architect',
  'consultant', 'analyst', 'director', 'lead',
];

const extractCurrentRole = (text) => {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 20)) {
    if (line.length < 5 || line.length > 60) continue;
    const lower = line.toLowerCase();
    if (COMMON_ROLES.some((role) => lower.includes(role))) return line;
  }
  return 'Unknown Role';
};

/**
 * Extract skills from text using the skill dictionary.
 * Fast single-pass: normalise text once, then check each skill with simple includes().
 * No RegExp rebuild per skill — avoids O(skills * textLen) cost.
 */
const extractSkillsFromText = (text) => {
  const normalizedText = ` ${text.toLowerCase()} `; // pad for boundary matching
  const found = new Set();

  for (const skill of SKILL_DICTIONARY) {
    const s = skill.toLowerCase();
    // Simple word-boundary check: surround with non-alphanumeric chars
    const idx = normalizedText.indexOf(s);
    if (idx === -1) continue;
    const before = normalizedText[idx - 1];
    const after = normalizedText[idx + s.length];
    if (/[a-z0-9]/.test(before) || /[a-z0-9]/.test(after)) continue;
    found.add(skill);
  }

  return Array.from(found);
};

/**
 * Full resume parsing pipeline.
 * Returns: { text, name, email, phone, extractedSkills, cgpa, yearsOfExperience, college, currentRole }
 */
const parseResume = async (filePath) => {
  const text = await extractText(filePath);
  const { name, email, phone } = extractMeta(text);
  const extractedSkills = extractSkillsFromText(text);
  const cgpa = extractCGPA(text);
  const yearsOfExperience = extractExperience(text);
  const college = extractCollege(text);
  const currentRole = extractCurrentRole(text);

  return { text, name, email, phone, extractedSkills, cgpa, yearsOfExperience, college, currentRole };
};

module.exports = { parseResume, extractSkillsFromText, extractText };

