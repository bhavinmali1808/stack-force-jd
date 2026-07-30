/**
 * Phase 2 — Weighted skill scoring engine.
 *
 * Scoring rules:
 *  - Must-have skills carry 60% of the total weight.
 *  - Nice-to-have skills carry 40%.
 *  - If ANY must-have skill is missing → score is CAPPED at 40 max.
 *  - Phase 3: replace this entire file with an AI call. Same I/O shape.
 *
 * @param {string[]} extractedSkills  - skills found in the resume
 * @param {string[]} requiredSkills   - plain skills list (Phase 1 fallback)
 * @param {{ skill: string, type: string }[]} weightedSkills - Phase 2 weighted list
 */
const computeMatchScore = (extractedSkills, requiredSkills, weightedSkills = []) => {
  const normalizedSet = new Set(
    (extractedSkills || []).map((s) => s.toLowerCase().trim())
  );
  const normalizedList = Array.from(normalizedSet);

  const skillMatch = (req) => {
    const r = req.toLowerCase().trim();
    if (normalizedSet.has(r)) return true;
    return normalizedList.some((e) => e.includes(r) || r.includes(e));
  };

  // --- Phase 2: Weighted scoring ---
  if (weightedSkills && weightedSkills.length > 0) {
    const mustHaves = [];
    const niceToHaves = [];

    for (const ws of weightedSkills) {
      if (ws.type === 'must-have') mustHaves.push(ws);
      else if (ws.type === 'nice-to-have') niceToHaves.push(ws);
    }

    const mustHaveMatched = [];
    const mustHaveMissing = [];
    for (const ws of mustHaves) {
      if (skillMatch(ws.skill)) mustHaveMatched.push(ws.skill);
      else mustHaveMissing.push(ws.skill);
    }

    const niceToHaveMatched = [];
    const niceToHaveMissing = [];
    for (const ws of niceToHaves) {
      if (skillMatch(ws.skill)) niceToHaveMatched.push(ws.skill);
      else niceToHaveMissing.push(ws.skill);
    }

    const mustFraction = mustHaves.length > 0 ? mustHaveMatched.length / mustHaves.length : 1;
    const niceFraction = niceToHaves.length > 0 ? niceToHaveMatched.length / niceToHaves.length : 1;

    let rawScore;
    if (mustHaves.length === 0) {
      rawScore = niceFraction * 100;
    } else if (niceToHaves.length === 0) {
      rawScore = mustFraction * 100;
    } else {
      rawScore = mustFraction * 60 + niceFraction * 40;
    }

    const hasMissingMustHave = mustHaveMissing.length > 0;
    const score = hasMissingMustHave ? Math.min(Math.round(rawScore), 40) : Math.round(rawScore);

    return {
      score,
      matchedSkills: [...mustHaveMatched, ...niceToHaveMatched],
      missingSkills: [...mustHaveMissing, ...niceToHaveMissing],
      hasMissingMustHave,
      mustHaveMatched,
      mustHaveMissing,
      niceToHaveMatched,
      niceToHaveMissing,
    };
  }

  // --- Phase 1 fallback: plain required skills ---
  if (!requiredSkills || requiredSkills.length === 0) {
    return {
      score: 0, matchedSkills: [], missingSkills: [],
      hasMissingMustHave: false,
      mustHaveMatched: [], mustHaveMissing: [],
      niceToHaveMatched: [], niceToHaveMissing: [],
    };
  }

  const matchedSkills = [];
  const missingSkills = [];
  for (const req of requiredSkills) {
    if (skillMatch(req)) matchedSkills.push(req);
    else missingSkills.push(req);
  }
  const score = Math.round((matchedSkills.length / requiredSkills.length) * 100);

  return {
    score, matchedSkills, missingSkills,
    hasMissingMustHave: false,
    mustHaveMatched: matchedSkills, mustHaveMissing: missingSkills,
    niceToHaveMatched: [], niceToHaveMissing: [],
  };
};

module.exports = { computeMatchScore };
