import React, { useState, useEffect } from 'react';
import { ShieldCheck, Server, AlertTriangle, RefreshCw, Key, CheckCircle, XCircle, HelpCircle, Activity, Play } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Deliverability() {
  const [activeTab, setActiveTab] = useState('dns');
  const [domain, setDomain] = useState('resuming.io');
  const [audit, setAudit] = useState(null);
  const [checkingDns, setCheckingDns] = useState(false);
  const [dkimKeys, setDkimKeys] = useState(null);

  // IP Pool & Warmup
  const [ips, setIps] = useState([]);
  const [newIp, setNewIp] = useState('');
  const [loadingIps, setLoadingIps] = useState(false);

  // Spam Tester State
  const [spamForm, setSpamForm] = useState({ subject: '', html: '' });
  const [spamResult, setSpamResult] = useState(null);
  const [testingSpam, setTestingSpam] = useState(false);

  const fetchDnsAudit = async () => {
    setCheckingDns(true);
    try {
      const res = await api.get(`/dns/verify?domain=${encodeURIComponent(domain)}`);
      if (res.data.success) setAudit(res.data.audit);
    } catch {
      toast.error('Failed to verify domain DNS');
    } finally {
      setCheckingDns(false);
    }
  };

  const fetchIps = async () => {
    setLoadingIps(true);
    try {
      const res = await api.get('/deliverability/ips');
      if (res.data.success) setIps(res.data.ips);
    } catch {
      toast.error('Failed to load IP pool');
    } finally {
      setLoadingIps(false);
    }
  };

  useEffect(() => {
    fetchDnsAudit();
    fetchIps();
  }, []);

  const handleGenerateDkim = async () => {
    try {
      const res = await api.post('/dns/generate-dkim', { domain });
      if (res.data.success) {
        setDkimKeys(res.data.keys);
        toast.success('Generated 2048-bit DKIM Key Pair');
      }
    } catch {
      toast.error('Failed to generate DKIM keys');
    }
  };

  const handleAddIp = async (e) => {
    e.preventDefault();
    if (!newIp) return toast.error('Enter an IP address');
    try {
      const res = await api.post('/deliverability/ips', { ipAddress: newIp });
      if (res.data.success) {
        toast.success('IP added to Pool');
        setNewIp('');
        fetchIps();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add IP');
    }
  };

  const handleCheckRbl = async (id) => {
    try {
      const res = await api.post(`/deliverability/ips/${id}/check-rbl`);
      if (res.data.success) {
        toast.success('RBL Blacklist check completed');
        fetchIps();
      }
    } catch {
      toast.error('RBL check failed');
    }
  };

  const handleAdvanceWarmup = async (id) => {
    try {
      const res = await api.post(`/deliverability/ips/${id}/advance-warmup`);
      if (res.data.success) {
        toast.success(`Advanced IP Warmup to Day ${res.data.ip.warmupDay}`);
        fetchIps();
      }
    } catch {
      toast.error('Failed to advance warmup');
    }
  };

  const handleTestSpam = async (e) => {
    e.preventDefault();
    setTestingSpam(true);
    try {
      const res = await api.post('/deliverability/test-spam', spamForm);
      if (res.data.success) setSpamResult(res.data.analysis);
    } catch {
      toast.error('Spam test failed');
    } finally {
      setTestingSpam(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Deliverability & DNS Authentication</h1>
        <p className="page-subtitle">Manage DKIM/SPF/DMARC/PTR records, dedicated IP warm-up curves, and SpamAssassin content tests</p>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        {[
          { id: 'dns', label: 'Domain & DNS (DKIM/SPF/DMARC)', icon: ShieldCheck },
          { id: 'ips', label: 'Dedicated IPv4 & Warm-up', icon: Server },
          { id: 'spam', label: 'SpamAssassin Content Tester', icon: Activity },
        ].map(t => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1rem', border: 'none', background: 'transparent',
                borderBottom: active ? '2px solid var(--purple)' : '2px solid transparent',
                color: active ? 'var(--purple)' : 'var(--text-2)',
                fontWeight: active ? 600 : 500, cursor: 'pointer', fontSize: '0.875rem'
              }}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DNS AUTHENTICATION */}
      {activeTab === 'dns' && (
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
            <input
              className="input"
              style={{ width: '280px' }}
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="Domain e.g. resuming.io"
            />
            <button className="btn-secondary" onClick={fetchDnsAudit} disabled={checkingDns}>
              <RefreshCw size={14} className={checkingDns ? 'spin' : ''} /> {checkingDns ? 'Verifying...' : 'Check DNS Records'}
            </button>
            <button className="btn-primary" onClick={handleGenerateDkim}>
              <Key size={14} /> Generate 2048-bit DKIM Key
            </button>
          </div>

          {/* Generated DKIM Key Display */}
          {dkimKeys && (
            <div className="card" style={{ marginBottom: '1.5rem', background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--purple)', marginBottom: '0.5rem' }}>Generated DKIM TXT Record</h3>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.25rem' }}>Record Name:</div>
              <code style={{ display: 'block', background: '#fff', padding: '0.5rem', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{dkimKeys.txtRecordName}</code>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.25rem' }}>Record Value (Base64 TXT):</div>
              <textarea readOnly className="input" style={{ width: '100%', height: '80px', fontFamily: 'monospace', fontSize: '0.75rem' }} value={dkimKeys.txtRecordValue} />
            </div>
          )}

          {/* Record Status Grid */}
          {audit && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {/* SPF */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700 }}>SPF Record</span>
                  {audit.spf.valid ? <CheckCircle color="var(--green)" size={18} /> : <XCircle color="var(--amber)" size={18} />}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.5rem' }}>Validates authorized mail servers</p>
                <code style={{ fontSize: '0.75rem', background: '#f3f4f6', padding: '0.4rem', borderRadius: '6px', display: 'block', wordBreak: 'break-all' }}>
                  {audit.spf.record || 'No SPF record found (v=spf1 ...)'}
                </code>
              </div>

              {/* DMARC */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700 }}>DMARC Record</span>
                  {audit.dmarc.valid ? <CheckCircle color="var(--green)" size={18} /> : <XCircle color="var(--amber)" size={18} />}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.5rem' }}>Policy: <strong>{audit.dmarc.policy || 'none'}</strong></p>
                <code style={{ fontSize: '0.75rem', background: '#f3f4f6', padding: '0.4rem', borderRadius: '6px', display: 'block', wordBreak: 'break-all' }}>
                  {audit.dmarc.record || 'No DMARC record found (_dmarc.domain)'}
                </code>
              </div>

              {/* DKIM */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700 }}>DKIM Signature</span>
                  {audit.dkim.valid ? <CheckCircle color="var(--green)" size={18} /> : <HelpCircle color="var(--amber)" size={18} />}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.5rem' }}>Cryptographic domain signature</p>
                <code style={{ fontSize: '0.75rem', background: '#f3f4f6', padding: '0.4rem', borderRadius: '6px', display: 'block', wordBreak: 'break-all' }}>
                  {audit.dkim.record || 'No active DKIM TXT record found'}
                </code>
              </div>

              {/* MX */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700 }}>MX Records</span>
                  {audit.mx.valid ? <CheckCircle color="var(--green)" size={18} /> : <XCircle color="var(--red)" size={18} />}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.5rem' }}>Inbound Mail Exchange servers</p>
                <div style={{ fontSize: '0.75rem' }}>
                  {audit.mx.records.length > 0 ? (
                    audit.mx.records.map((m, i) => (
                      <div key={i} style={{ padding: '0.2rem 0', borderBottom: '1px solid #f3f4f6' }}>{m.exchange} (Prio: {m.priority})</div>
                    ))
                  ) : 'No MX records found'}
                </div>
              </div>

              {/* DNSSEC */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700 }}>DNSSEC Validation</span>
                  {audit.dnssec.secure ? <CheckCircle color="var(--green)" size={18} /> : <AlertTriangle color="var(--amber)" size={18} />}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Domain Name System Security Extensions</p>
                <span className={`badge ${audit.dnssec.secure ? 'badge-green' : 'badge-amber'}`} style={{ marginTop: '0.5rem' }}>
                  {audit.dnssec.status?.toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DEDICATED IP & WARM-UP */}
      {activeTab === 'ips' && (
        <div>
          <form onSubmit={handleAddIp} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <input
              className="input"
              style={{ width: '260px' }}
              placeholder="Dedicated IPv4 Address (e.g. 192.0.2.1)"
              value={newIp}
              onChange={e => setNewIp(e.target.value)}
            />
            <button type="submit" className="btn-primary">+ Add Dedicated IP</button>
          </form>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>Status</th>
                  <th>Warm-up Day</th>
                  <th>Daily Send Quota</th>
                  <th>RBL Blacklist Monitor</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingIps ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading IP Pool...</td></tr>
                ) : ips.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>No dedicated IPv4 addresses configured</td></tr>
                ) : (
                  ips.map(ip => (
                    <tr key={ip._id}>
                      <td style={{ fontWeight: 600 }}>{ip.ipAddress}</td>
                      <td>
                        <span className={`badge ${ip.status === 'active' ? 'badge-green' : ip.status === 'blacklisted' ? 'badge-red' : 'badge-amber'}`}>
                          {ip.status.toUpperCase()}
                        </span>
                      </td>
                      <td>Day {ip.warmupDay} / 30</td>
                      <td>{ip.sentToday} / {ip.dailyQuota?.toLocaleString()} emails</td>
                      <td>
                        {ip.blacklists && ip.blacklists.some(b => b.listed) ? (
                          <span className="badge badge-red"><AlertTriangle size={12} /> Blacklisted</span>
                        ) : (
                          <span className="badge badge-green"><CheckCircle size={12} /> Clean (0 RBLs)</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleCheckRbl(ip._id)}>
                            <RefreshCw size={12} /> RBL Check
                          </button>
                          <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleAdvanceWarmup(ip._id)}>
                            +1 Day
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SPAMASSASSIN CONTENT TESTER */}
      {activeTab === 'spam' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Test Email Spam Score</h3>
            <form onSubmit={handleTestSpam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Subject Line</label>
                <input
                  className="input"
                  placeholder="e.g. 100% FREE URGENT OFFER!!!"
                  value={spamForm.subject}
                  onChange={e => setSpamForm({ ...spamForm, subject: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Email HTML Body</label>
                <textarea
                  className="input"
                  style={{ height: '180px', fontFamily: 'monospace', fontSize: '0.75rem' }}
                  placeholder="<p>Click here to claim your reward...</p>"
                  value={spamForm.html}
                  onChange={e => setSpamForm({ ...spamForm, html: e.target.value })}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={testingSpam}>
                <Play size={14} /> {testingSpam ? 'Analyzing...' : 'Run SpamAssassin Analysis'}
              </button>
            </form>
          </div>

          {/* Analysis Results */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Analysis Results</h3>
            {spamResult ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{
                    fontSize: '2rem', fontWeight: 800,
                    color: spamResult.score >= 5 ? 'var(--red)' : spamResult.score >= 2.5 ? 'var(--amber)' : 'var(--green)'
                  }}>
                    {spamResult.score} / 10
                  </div>
                  <div>
                    <span className={`badge ${spamResult.score >= 5 ? 'badge-red' : spamResult.score >= 2.5 ? 'badge-amber' : 'badge-green'}`}>
                      {spamResult.status.toUpperCase()}
                    </span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
                      {spamResult.score < 2.5 ? 'High inbox deliverability' : 'May trigger spam filters'}
                    </p>
                  </div>
                </div>

                <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Triggered Rules</h4>
                {spamResult.rulesTriggered.length === 0 ? (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--green)' }}>✅ No spam trigger rules triggered!</p>
                ) : (
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.8125rem', color: 'var(--red)' }}>
                    {spamResult.rulesTriggered.map((rule, idx) => (
                      <li key={idx} style={{ marginBottom: '0.25rem' }}>{rule}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>Run analysis to test subject line and email body against SpamAssassin & Rspamd filter rules.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
