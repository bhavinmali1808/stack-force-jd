/**
 * segmentService.js
 * ─────────────────
 * Resolves a Segment's AND/OR condition tree into a MongoDB Contact query.
 * Also handles the built-in audienceType shortcuts (all, premium, free, etc.)
 */

const Contact = require('../models/Contact');
const SuppressionList = require('../models/SuppressionList');
const BounceList = require('../models/BounceList');

// ── Field → MongoDB path mapping ─────────────
const FIELD_MAP = {
  plan:       'plan',
  isVerified: 'isVerified',
  hasResume:  'hasResume',
  isActive:   'isActive',
  joinedAt:   'joinedAt',
  resumeScore:'resumeScore',
  tags:       'tags',
  source:     'source',
  emailCount: 'emailCount',
};

const OPERATOR_MAP = {
  equals:      (val) => val,
  not_equals:  (val) => ({ $ne: val }),
  contains:    (val) => ({ $in: Array.isArray(val) ? val : [val] }),
  gt:          (val) => ({ $gt: val }),
  lt:          (val) => ({ $lt: val }),
  gte:         (val) => ({ $gte: val }),
  lte:         (val) => ({ $lte: val }),
  exists:      ()    => ({ $exists: true, $ne: null }),
  not_exists:  ()    => ({ $exists: false }),
};

const buildCondition = (node) => {
  if (!node) return {};

  // Leaf node
  if (node.field) {
    const field = FIELD_MAP[node.field] || node.field;
    const opFn  = OPERATOR_MAP[node.operator] || OPERATOR_MAP.equals;
    return { [field]: opFn(node.value) };
  }

  // Group node
  if (node.logic && node.conditions?.length) {
    const built = node.conditions.map(buildCondition).filter(Boolean);
    return node.logic === 'OR' ? { $or: built } : { $and: built };
  }

  return {};
};

// Built-in audience type shortcuts
const AUDIENCE_QUERIES = {
  all:          {},
  premium:      { plan: 'premium' },
  free:         { plan: 'free' },
  trial:        { plan: 'trial' },
  verified:     { isVerified: true },
  unverified:   { isVerified: false },
  has_resume:   { hasResume: true },
  no_resume:    { hasResume: false },
  today:        { joinedAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } },
  this_month:   { joinedAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
};

/**
 * Get suppressed + bounced emails to exclude
 */
const getSuppressedEmails = async () => {
  const [suppressed, bounced] = await Promise.all([
    SuppressionList.find({}).select('email').lean(),
    BounceList.find({ bounceType: 'hard' }).select('email').lean(),
  ]);
  return [...new Set([...suppressed.map(s => s.email), ...bounced.map(b => b.email)])];
};

/**
 * Resolve audience to a list of Contact documents
 * @param {string} audienceType  - built-in shortcut
 * @param {object} segment       - Segment document with conditions
 * @returns {Contact[]}
 */
const resolveAudience = async (audienceType, segment = null) => {
  const suppressedEmails = await getSuppressedEmails();

  let query = {
    isUnsubscribed: { $ne: true },
    isActive: true,
    email: { $nin: suppressedEmails },
  };

  if (segment?.conditions) {
    const segQuery = buildCondition(segment.conditions);
    Object.assign(query, segQuery);
  } else if (audienceType && AUDIENCE_QUERIES[audienceType]) {
    Object.assign(query, AUDIENCE_QUERIES[audienceType]);
  }

  console.log("AUDIENCE QUERY:", JSON.stringify(query, null, 2));

  const contacts = await Contact.find(query)
    .select("email firstName lastName plan resumeScore resumeTitle isVerified")
    .lean();

  console.log("FOUND CONTACTS:", contacts.length);
  console.log(contacts);

  return contacts;
};
/**
 * Count audience size without fetching all docs
 */
const countAudience = async (audienceType, segment = null) => {
  const suppressedEmails = await getSuppressedEmails();
  let query = {
    isUnsubscribed: { $ne: true },
    isActive: true,
    email: { $nin: suppressedEmails },
  };
  if (segment?.conditions) Object.assign(query, buildCondition(segment.conditions));
  else if (audienceType && AUDIENCE_QUERIES[audienceType]) Object.assign(query, AUDIENCE_QUERIES[audienceType]);
  return Contact.countDocuments(query);
};

module.exports = { resolveAudience, countAudience, buildCondition, getSuppressedEmails, AUDIENCE_QUERIES };
