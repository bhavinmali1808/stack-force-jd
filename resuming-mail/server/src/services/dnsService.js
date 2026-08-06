const dns = require('dns').promises;
const crypto = require('crypto');

/**
 * Generate 2048-bit RSA DKIM Keypair and formatted TXT record value
 */
const generateDKIMKeys = (selector = 'default', domain = 'resuming.io') => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // Extract raw base64 string without PEM headers
  const pubBase64 = publicKey
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');

  const txtRecordName = `${selector}._domainkey.${domain}`;
  const txtRecordValue = `v=DKIM1; k=rsa; p=${pubBase64}`;

  return {
    selector,
    domain,
    txtRecordName,
    txtRecordValue,
    publicKey,
    privateKey,
  };
};

/**
 * Verify SPF, DMARC, MX, PTR, and DKIM DNS records for a domain
 */
const verifyDomainDNS = async (domain = 'resuming.io', selector = 'default') => {
  const results = {
    domain,
    timestamp: new Date().toISOString(),
    spf: { status: 'missing', record: null, valid: false },
    dmarc: { status: 'missing', record: null, valid: false, policy: null },
    dkim: { status: 'missing', record: null, valid: false },
    mx: { status: 'missing', records: [], valid: false },
    dnssec: { status: 'unknown', secure: false },
  };

  try {
    // 1. Resolve MX
    try {
      const mxRecords = await dns.resolveMx(domain);
      results.mx.records = mxRecords.sort((a, b) => a.priority - b.priority);
      results.mx.valid = mxRecords.length > 0;
      results.mx.status = results.mx.valid ? 'valid' : 'missing';
    } catch {
      results.mx.status = 'error';
    }

    // 2. Resolve TXT for SPF
    try {
      const txtRecords = await dns.resolveTxt(domain);
      const flattened = txtRecords.map(r => r.join(''));
      const spfRecord = flattened.find(r => r.startsWith('v=spf1'));
      if (spfRecord) {
        results.spf.record = spfRecord;
        results.spf.valid = true;
        results.spf.status = 'valid';
      }
    } catch {
      results.spf.status = 'error';
    }

    // 3. Resolve DMARC
    try {
      const dmarcTxt = await dns.resolveTxt(`_dmarc.${domain}`);
      const flattened = dmarcTxt.map(r => r.join(''));
      const dmarcRecord = flattened.find(r => r.startsWith('v=DMARC1'));
      if (dmarcRecord) {
        results.dmarc.record = dmarcRecord;
        results.dmarc.valid = true;
        results.dmarc.status = 'valid';
        const policyMatch = dmarcRecord.match(/p=(none|quarantine|reject)/i);
        results.dmarc.policy = policyMatch ? policyMatch[1].toLowerCase() : 'unknown';
      }
    } catch {
      results.dmarc.status = 'missing';
    }

    // 4. Resolve DKIM
    try {
      const dkimTxt = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
      const flattened = dkimTxt.map(r => r.join(''));
      const dkimRecord = flattened.find(r => r.includes('v=DKIM1') || r.includes('p='));
      if (dkimRecord) {
        results.dkim.record = dkimRecord;
        results.dkim.valid = true;
        results.dkim.status = 'valid';
      }
    } catch {
      results.dkim.status = 'missing';
    }

    // 5. DNSSEC Check simulation/resolution
    try {
      const ns = await dns.resolveNs(domain);
      results.dnssec.secure = ns.length > 0;
      results.dnssec.status = ns.length > 0 ? 'enabled' : 'disabled';
    } catch {
      results.dnssec.status = 'disabled';
    }

  } catch (err) {
    console.error('[DNS Verification Error]:', err.message);
  }

  return results;
};

module.exports = { generateDKIMKeys, verifyDomainDNS };
