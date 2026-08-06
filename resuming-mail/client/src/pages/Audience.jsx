import React, { useState, useEffect } from 'react';
import { Users, Search, Trash2, ChevronDown, Download, Filter, UserPlus, Plus, Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const PLAN_CONFIG = {
  premium: { label: 'Premium', className: 'badge-purple' },
  trial:   { label: 'Trial',   className: 'badge-amber'  },
  free:    { label: 'Free',    className: 'badge-gray'   },
};

function Avatar({ name, email }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : email?.[0]?.toUpperCase() || '?';
  const colors = ['#ede9fe','#dbeafe','#dcfce7','#fce7f3','#fef3c7','#fee2e2'];
  const textColors = ['#7c3aed','#2563eb','#059669','#be185d','#d97706','#dc2626'];
  const idx = (name || email || '').charCodeAt(0) % colors.length;
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: colors[idx], color: textColors[idx],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  );
}

export default function Audience() {
  const [contacts, setContacts]     = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [planFilter, setPlanFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal]       = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Single Contact Form State
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    plan: 'free',
    isVerified: true,
    resumeTitle: '',
    tags: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Import State
  const [importText, setImportText]     = useState('');
  const [importFile, setImportFile]     = useState(null);
  const [parsedPreview, setParsedPreview] = useState([]);
  const [importing, setImporting]       = useState(false);

  const fetchContacts = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        api.get(`/audience?search=${search}&plan=${planFilter}`),
        api.get('/audience/stats'),
      ]);
      if (cRes.data.success) setContacts(cRes.data.contacts);
      if (sRes.data.success) setStats(sRes.data.stats);
    } catch { toast.error('Failed to load audience'); }
    finally   { setLoading(false); }
  };

  useEffect(() => { fetchContacts(); }, [search, planFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete and suppress contact?')) return;
    try { await api.delete(`/audience/${id}`); toast.success('Contact removed'); fetchContacts(); }
    catch { toast.error('Failed to remove'); }
  };

  // Export Contacts
  const handleExport = async () => {
    try {
      const res = await api.get(`/audience/export?search=${encodeURIComponent(search)}&plan=${encodeURIComponent(planFilter)}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audience_contacts_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Contacts exported successfully');
    } catch {
      // Fallback: Client-side CSV Export from loaded contacts
      if (contacts.length === 0) {
        return toast.error('No contacts available to export');
      }
      let csv = 'Email,First Name,Last Name,Plan,Verified,Resume Title,Joined Date\n';
      contacts.forEach(c => {
        const email = `"${(c.email || '').replace(/"/g, '""')}"`;
        const fn = `"${(c.firstName || '').replace(/"/g, '""')}"`;
        const ln = `"${(c.lastName || '').replace(/"/g, '""')}"`;
        const planStr = `"${c.plan || 'free'}"`;
        const ver = c.isVerified ? 'Yes' : 'No';
        const title = `"${(c.resumeTitle || '').replace(/"/g, '""')}"`;
        const date = `"${new Date(c.joinedAt || c.createdAt || Date.now()).toLocaleDateString()}"`;
        csv += `${email},${fn},${ln},${planStr},${ver},${title},${date}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audience_contacts_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Exported contacts CSV');
    }
  };

  // Add Single Contact
  const handleAddContactSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.email.trim()) return toast.error('Email is required');
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        email: formData.email.trim().toLowerCase(),
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };
      const res = await api.post('/audience', payload);
      if (res.data.success) {
        toast.success('Contact added successfully!');
        setShowAddModal(false);
        setFormData({ email: '', firstName: '', lastName: '', plan: 'free', isVerified: true, resumeTitle: '', tags: '' });
        fetchContacts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add contact');
    } finally {
      setSubmitting(false);
    }
  };

  // Parse CSV/Text/JSON for Import
  const parseRawInput = (text) => {
    const raw = text.trim();
    if (!raw) {
      setParsedPreview([]);
      return;
    }
    // Try JSON array first
    if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        const json = JSON.parse(raw);
        if (Array.isArray(json)) {
          const list = json.map(item => {
            if (typeof item === 'string') return { email: item.trim().toLowerCase() };
            if (item && item.email) return { ...item, email: String(item.email).trim().toLowerCase() };
            return null;
          }).filter(Boolean);
          setParsedPreview(list);
          return;
        }
      } catch { /* ignore and fallback to CSV/lines */ }
    }

    // CSV or line-by-line fallback
    const lines = raw.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) {
      setParsedPreview([]);
      return;
    }

    // Header inspection
    const firstLineParts = lines[0].split(',').map(p => p.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    const hasHeader = firstLineParts.some(p => p.includes('email'));
    
    let emailIdx = 0, fnIdx = 1, lnIdx = 2, planIdx = 3;
    if (hasHeader) {
      firstLineParts.forEach((header, idx) => {
        if (header.includes('email')) emailIdx = idx;
        else if (header.includes('first') || header.includes('fname')) fnIdx = idx;
        else if (header.includes('last') || header.includes('lname')) lnIdx = idx;
        else if (header.includes('plan')) planIdx = idx;
      });
    }

    const dataLines = hasHeader ? lines.slice(1) : lines;
    const list = [];
    const validPlans = ['free', 'trial', 'premium', 'enterprise'];

    for (let line of dataLines) {
      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      const email = (parts[emailIdx] || parts[0] || '').toLowerCase().trim();
      if (!email || !email.includes('@')) continue;

      const firstName = parts[fnIdx] || parts[1] || '';
      const lastName  = parts[lnIdx] || parts[2] || '';
      const rawPlan   = (parts[planIdx] || parts[3] || 'free').toLowerCase();
      const plan      = validPlans.includes(rawPlan) ? rawPlan : 'free';

      list.push({ email, firstName, lastName, plan });
    }
    setParsedPreview(list);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      setImportText(content);
      parseRawInput(content);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (parsedPreview.length === 0) {
      return toast.error('No valid contacts found to import');
    }
    setImporting(true);
    try {
      const res = await api.post('/audience/import', { contacts: parsedPreview });
      if (res.data.success) {
        toast.success(`Successfully imported/updated ${res.data.upserted || res.data.total || parsedPreview.length} contacts!`);
        setShowImportModal(false);
        setImportText('');
        setImportFile(null);
        setParsedPreview([]);
        fetchContacts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Audience</h1>
          <p className="page-subtitle">Manage and segment your subscriber list from Resuming.io</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={14} /> Add Contact
          </button>
          <button className="btn-primary" onClick={() => setShowImportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <UserPlus size={14} /> Import Contacts
          </button>
        </div>
      </div>

      {/* Stat summary row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Total Subscribers', value: stats.total,    color: 'var(--purple)', bg: '#f5f3ff' },
            { label: 'Premium',           value: stats.premium,  color: 'var(--green)',  bg: '#ecfdf5' },
            { label: 'Free Tier',         value: stats.free,     color: 'var(--text-2)', bg: '#f3f4f6' },
            { label: 'Verified Emails',   value: stats.verified, color: 'var(--blue)',   bg: '#eff6ff' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', border: '1px solid var(--border)', borderRadius: '12px',
              padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500, marginBottom: '0.5rem' }}>{s.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value?.toLocaleString() || 0}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input
            className="input"
            style={{ paddingLeft: '2.375rem' }}
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="select" style={{ width: 160 }} value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="trial">Trial</option>
          <option value="premium">Premium</option>
        </select>
        <button className="btn-ghost" onClick={fetchContacts}><Filter size={13} /> Filter</button>
        <button className="btn-ghost" onClick={handleExport}><Download size={13} /> Export</button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Contact <ChevronDown size={11} style={{ display:'inline', verticalAlign:'middle', marginLeft:2 }} /></th>
              <th>Plan</th>
              <th>Status</th>
              <th>Resume Title</th>
              <th>Joined Date <ChevronDown size={11} style={{ display:'inline', verticalAlign:'middle', marginLeft:2 }} /></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j}><div style={{ height: 14, background: '#f3f4f6', borderRadius: 4, width: j === 0 ? '160px' : '80px' }} /></td>
                  ))}
                </tr>
              ))
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
                  <Users size={32} style={{ marginBottom: '0.75rem', opacity: 0.35, display: 'block', margin: '0 auto 0.75rem' }} />
                  No subscribers found matching criteria.
                </td>
              </tr>
            ) : (
              contacts.map(c => {
                const plan = PLAN_CONFIG[c.plan] || PLAN_CONFIG.free;
                return (
                  <tr key={c._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Avatar name={`${c.firstName || ''} ${c.lastName || ''}`} email={c.email} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '0.8125rem' }}>{c.firstName || '—'} {c.lastName || ''}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${plan.className}`}>{plan.label}</span></td>
                    <td>
                      {c.isVerified
                        ? <span className="badge badge-green">Verified</span>
                        : <span className="badge badge-gray">Unverified</span>
                      }
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.resumeTitle || '—'}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                      {new Date(c.joinedAt || c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <button onClick={() => handleDelete(c._id)} title="Delete" style={{ padding: '0.25rem', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Single Add Contact Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem', background: '#fff', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Add New Contact</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '0.25rem' }}>Email Address *</label>
                <input
                  type="email"
                  required
                  className="input"
                  placeholder="e.g. alex@example.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '0.25rem' }}>First Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Alex"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '0.25rem' }}>Last Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Morgan"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '0.25rem' }}>Plan Tier</label>
                  <select
                    className="select"
                    style={{ width: '100%' }}
                    value={formData.plan}
                    onChange={e => setFormData({ ...formData, plan: e.target.value })}
                  >
                    <option value="free">Free</option>
                    <option value="trial">Trial</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '0.25rem' }}>Resume Title</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Senior Developer"
                    value={formData.resumeTitle}
                    onChange={e => setFormData({ ...formData, resumeTitle: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '0.25rem' }}>Tags (comma-separated)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="newsletter, developer, lead"
                  value={formData.tags}
                  onChange={e => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '580px', padding: '1.5rem', background: '#fff', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Import Audience Contacts</h2>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginBottom: '1rem' }}>
              Upload a <strong>CSV file</strong>, or paste <strong>raw emails/CSV lines</strong> (Format: <code>email, firstName, lastName, plan</code>).
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <Upload size={14} /> Choose CSV/JSON File
                <input type="file" accept=".csv, .txt, .json" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
              {importFile && <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: 'var(--purple)', fontWeight: 600 }}>{importFile.name}</span>}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '0.25rem' }}>Paste Contacts Raw Text / JSON</label>
              <textarea
                className="input"
                style={{ height: '110px', fontFamily: 'monospace', fontSize: '0.75rem', width: '100%' }}
                placeholder={`john@example.com, John, Doe, premium\nsarah@example.com, Sarah, Connor, free\n...`}
                value={importText}
                onChange={e => {
                  setImportText(e.target.value);
                  parseRawInput(e.target.value);
                }}
              />
            </div>

            {/* Parsed Preview count */}
            <div style={{
              background: '#f9fafb', border: '1px solid var(--border)', borderRadius: '8px',
              padding: '0.75rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                {parsedPreview.length > 0 ? <CheckCircle2 size={16} color="var(--green)" /> : <AlertCircle size={16} color="var(--amber)" />}
                <span>Found <strong>{parsedPreview.length}</strong> valid contacts ready to import</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowImportModal(false)}>Cancel</button>
              <button type="button" className="btn-primary" disabled={importing || parsedPreview.length === 0} onClick={handleImportSubmit}>
                {importing ? 'Importing...' : `Import ${parsedPreview.length} Contacts`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


