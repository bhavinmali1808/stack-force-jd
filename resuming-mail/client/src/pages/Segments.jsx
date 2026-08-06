import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Users, Trash2, Target, X, CheckCircle2 } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const SEG_COLORS = [
  { border: '#c4b5fd', bg: '#f5f3ff', icon: '#7c3aed' },
  { border: '#a7f3d0', bg: '#ecfdf5', icon: '#059669' },
  { border: '#bfdbfe', bg: '#eff6ff', icon: '#2563eb' },
  { border: '#fde68a', bg: '#fffbeb', icon: '#d97706' },
  { border: '#fecaca', bg: '#fef2f2', icon: '#dc2626' },
];

export default function Segments() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading]   = useState(true);

  // Create Segment Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rules: {
      plan: '',
      isVerified: '',
      hasResume: '',
    }
  });

  const fetchSegments = async () => {
    try {
      const res = await api.get('/segments');
      if (res.data.success) setSegments(res.data.segments);
    } catch { toast.error('Failed to load segments'); }
    finally   { setLoading(false); }
  };

  useEffect(() => { fetchSegments(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete segment?')) return;
    try { await api.delete(`/segments/${id}`); toast.success('Deleted'); fetchSegments(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Segment name is required');
    setSubmitting(true);
    try {
      const rulesPayload = {};
      if (formData.rules.plan) rulesPayload.plan = formData.rules.plan;
      if (formData.rules.isVerified !== '') rulesPayload.isVerified = formData.rules.isVerified === 'true';
      if (formData.rules.hasResume !== '') rulesPayload.hasResume = formData.rules.hasResume === 'true';

      const res = await api.post('/segments', {
        name: formData.name,
        description: formData.description,
        rules: rulesPayload,
      });

      if (res.data.success) {
        toast.success('Dynamic Segment created!');
        setShowModal(false);
        setFormData({ name: '', description: '', rules: { plan: '', isVerified: '', hasResume: '' } });
        fetchSegments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create segment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Segments</h1>
          <p className="page-subtitle">Dynamic audience rules for hyper-targeted delivery</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={14} /> Create Segment
        </button>
      </div>

      {/* Built-in segments grid */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.875rem' }}>Built-in Audience Segments</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>
          {[
            { label: 'All Contacts',      key: 'all',         desc: 'All active subscribers in your list',              icon: '👥' },
            { label: 'Premium Users',     key: 'premium',     desc: 'Paying subscribers on the premium plan',           icon: '⭐' },
            { label: 'Free Tier Users',   key: 'free',        desc: 'Subscribers on the free plan',                     icon: '🆓' },
            { label: 'Trial Users',       key: 'trial',       desc: 'Users currently in the trial period',              icon: '🕐' },
            { label: 'Verified Emails',   key: 'verified',    desc: 'Contacts with verified email addresses',           icon: '✅' },
            { label: 'Users with Resume', key: 'has_resume',  desc: 'Contacts who have uploaded a resume',              icon: '📄' },
          ].map((s, i) => {
            const c = SEG_COLORS[i % SEG_COLORS.length];
            return (
              <div key={s.key} style={{
                background: '#fff', border: `1px solid var(--border)`,
                borderRadius: '12px', padding: '1.25rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.2s, border-color 0.2s',
                cursor: 'default',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '9px', background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem' }}>
                    {s.icon}
                  </div>
                  <span className="badge badge-purple" style={{ fontSize: '0.625rem' }}>Built-in</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-1)', marginBottom: '0.3rem' }}>{s.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom segments */}
      <div>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.875rem' }}>Custom Dynamic Segments</h2>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.875rem' }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', height: 120, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <div style={{ height: 14, background: '#f3f4f6', borderRadius: 4, width: '60%', marginBottom: 8 }} />
                <div style={{ height: 12, background: '#f3f4f6', borderRadius: 4, width: '80%' }} />
              </div>
            ))}
          </div>
        ) : segments.length === 0 ? (
          <div style={{
            background: '#fff', border: '1px dashed #d1d5db', borderRadius: '12px',
            padding: '3rem 2rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.875rem' }}>🎯</div>
            <div style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.4rem' }}>No custom segments yet</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: '1.25rem' }}>
              Create a targeted audience segment based on plan, verification status, or tags.
            </div>
            <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={14} /> Create First Segment
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.875rem' }}>
            {segments.map((s, i) => {
              const c = SEG_COLORS[i % SEG_COLORS.length];
              return (
                <div key={s._id} style={{
                  background: '#fff', border: '1px solid var(--border)', borderRadius: '12px',
                  padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.625rem' }}>Dynamic</span>
                    <button onClick={() => handleDelete(s._id)} style={{ padding: '0.25rem', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', marginBottom: '0.375rem' }}>{s.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.875rem', lineHeight: 1.5 }}>{s.description || 'No description provided'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Matching users</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--purple)' }}>{s.userCount?.toLocaleString() || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Segment Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '1.5rem', background: '#fff', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Create Custom Segment</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '0.25rem' }}>Segment Name *</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. Active Premium Developers"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '0.25rem' }}>Description</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Target users who match specific subscription rules"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.75rem' }}>Filter Rules (Criteria)</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'block', marginBottom: '0.2rem' }}>Plan Filter</label>
                    <select
                      className="select"
                      style={{ width: '100%' }}
                      value={formData.rules.plan}
                      onChange={e => setFormData({ ...formData, rules: { ...formData.rules, plan: e.target.value } })}
                    >
                      <option value="">Any Plan</option>
                      <option value="free">Free Tier</option>
                      <option value="trial">Trial</option>
                      <option value="premium">Premium Tier</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'block', marginBottom: '0.2rem' }}>Verified Email</label>
                    <select
                      className="select"
                      style={{ width: '100%' }}
                      value={formData.rules.isVerified}
                      onChange={e => setFormData({ ...formData, rules: { ...formData.rules, isVerified: e.target.value } })}
                    >
                      <option value="">Any Status</option>
                      <option value="true">Verified Only</option>
                      <option value="false">Unverified Only</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'block', marginBottom: '0.2rem' }}>Has Resume Uploaded</label>
                  <select
                    className="select"
                    style={{ width: '100%' }}
                    value={formData.rules.hasResume}
                    onChange={e => setFormData({ ...formData, rules: { ...formData.rules, hasResume: e.target.value } })}
                  >
                    <option value="">Any</option>
                    <option value="true">Yes (Resume Attached)</option>
                    <option value="false">No (No Resume)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Save Segment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

