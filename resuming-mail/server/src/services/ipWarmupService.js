const dns = require('dns').promises;

// Standard 30-day Warmup Curve
const WARMUP_SCHEDULE = {
  1: 50, 2: 100, 3: 200, 4: 400, 5: 800,
  6: 1500, 7: 2500, 8: 4000, 9: 6000, 10: 8500,
  11: 12000, 12: 16000, 13: 20000, 14: 25000, 15: 30000,
  20: 50000, 25: 75000, 30: 100000,
};

const RBL_LISTS = [
  'zen.spamhaus.org',
  'bl.spamcop.net',
  'dnsbl.sorbs.net',
  'b.barracudacentral.org',
  'cbl.abuseat.org',
];

/**
 * Get daily sending quota based on warmup day
 */
const getWarmupQuota = (day = 1) => {
  if (day >= 30) return 100000;
  if (WARMUP_SCHEDULE[day]) return WARMUP_SCHEDULE[day];

  // Interpolate
  const days = Object.keys(WARMUP_SCHEDULE).map(Number).sort((a, b) => a - b);
  const prevDay = days.filter(d => d <= day).pop() || 1;
  return WARMUP_SCHEDULE[prevDay] || 50;
};

/**
 * Check IP address against major DNS Real-time Blackhole Lists (RBLs)
 */
const checkRblBlacklists = async (ipAddress = '127.0.0.1') => {
  if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === 'localhost') {
    return RBL_LISTS.map(rbl => ({ rbl, listed: false, checkedAt: new Date() }));
  }

  const reversedIp = ipAddress.split('.').reverse().join('.');
  const results = await Promise.all(
    RBL_LISTS.map(async (rbl) => {
      try {
        const queryHost = `${reversedIp}.${rbl}`;
        await dns.resolve4(queryHost);
        return { rbl, listed: true, checkedAt: new Date() };
      } catch {
        return { rbl, listed: false, checkedAt: new Date() };
      }
    })
  );

  return results;
};

module.exports = { WARMUP_SCHEDULE, getWarmupQuota, checkRblBlacklists };
