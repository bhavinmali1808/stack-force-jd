import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Users, Trash2, Target } from 'lucide-react';
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Segments</h1>
          <p className="page-subtitle">Dynamic audience rules for hyper-targeted delivery</p>
        </div>
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
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>
              Campaigns currently use the built-in audience segments above.
            </div>
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
    </div>
  );
}
