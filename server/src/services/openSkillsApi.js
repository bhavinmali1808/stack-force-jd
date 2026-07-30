const axios = require('axios');

const BASE_URL = 'http://api.dataatwork.org/v1';
const TIMEOUT = 5000; // 5 second timeout so we don't hang if API is down

const api = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
});

// Simple memory cache to avoid hitting the rate limit
const cache = new Map();

/**
 * Autocomplete skills from Open Skills API
 * @param {string} query 
 * @returns {Array} List of skills
 */
const autocompleteSkill = async (query) => {
  if (!query) return [];
  if (cache.has(`auto_${query}`)) return cache.get(`auto_${query}`);

  try {
    const response = await api.get('/skills/autocomplete', {
      params: { contains: query }
    });
    
    cache.set(`auto_${query}`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[OpenSkillsAPI] Autocomplete failed for query "${query}":`, error.message);
    return [];
  }
};

/**
 * Normalize an array of skills using the Open Skills API.
 * Maps extracted skills to their standardized names.
 */
const normalizeSkills = async (skillsArray) => {
  if (!skillsArray || skillsArray.length === 0) return [];
  
  const promises = skillsArray.map(async (skill) => {
    const cacheKey = `norm_${skill}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    try {
      const response = await api.get('/skills/autocomplete', {
        params: { contains: skill },
      });

      const data = response.data;
      if (Array.isArray(data) && data.length > 0) {
        const exactMatch = data.find((item) => item.suggestion.toLowerCase() === skill.toLowerCase());
        const standardizedSkill = exactMatch ? exactMatch.suggestion : data[0].suggestion;
        cache.set(cacheKey, standardizedSkill);
        return standardizedSkill;
      } else {
        cache.set(cacheKey, skill);
        return skill;
      }
    } catch (error) {
      cache.set(cacheKey, skill);
      return skill;
    }
  });

  const results = await Promise.all(promises);
  return Array.from(new Set(results));
};

module.exports = {
  autocompleteSkill,
  normalizeSkills
};
