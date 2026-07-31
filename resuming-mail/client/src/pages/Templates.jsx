import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit3, Copy, Trash2, Search, Filter, Layout } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const TEMPLATE_COLORS = [
  { bg: '#f5f3ff', border: '#c4b5fd', accent: '#7c3aed', emoji: '📧' },
  { bg: '#ecfdf5', border: '#a7f3d0', accent: '#059669', emoji: '💼' },
  { bg: '#eff6ff', border: '#bfdbfe', accent: '#2563eb', emoji: '🎯' },
  { bg: '#fffbeb', border: '#fde68a', accent: '#d97706', emoji: '⭐' },
  { bg: '#fce7f3', border: '#fbcfe8', accent: '#be185d', emoji: '🎨' },
  { bg: '#f0fdf4', border: '#bbf7d0', accent: '#16a34a', emoji: '✉️' },
];

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const navigate = useNavigate();

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/templates');
      if (res.data.success) setTemplates(res.data.templates);
    } catch { toast.error('Failed to load templates'); }
    finally   { setLoading(false); }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleDuplicate = async (id) => {
    try { await api.post(`/templates/${id}/duplicate`); toast.success('Duplicated'); fetchTemplates(); }
    catch { toast.error('Failed to duplicate'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete template?')) return;
    try { await api.delete(`/templates/${id}`); toast.success('Deleted'); fetchTemplates(); }
    catch { toast.error('Failed to delete'); }
  };

  const filtered = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Email Templates</h1>
          <p className="page-subtitle">Pre-built transactional templates and custom designs for your campaigns</p>
        </div>
        <Link to="/templates/new/builder" className="btn-primary">
          <Plus size={14} /> Create Template
        </Link>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
          <input className="input" style={{ paddingLeft: '2.375rem' }} placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-ghost"><Filter size={13} /> Filter by Category</button>
      </div>

      {/* Template grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', height: 160 }}>
              <div style={{ height: 14, background: '#f3f4f6', borderRadius: 4, width: '60%', marginBottom: 8 }} />
              <div style={{ height: 12, background: '#f3f4f6', borderRadius: 4, width: '80%' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: '#fff', border: '1px dashed #d1d5db', borderRadius: '12px',
          padding: '3rem 2rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.875rem' }}>📭</div>
          <div style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.4rem' }}>No templates found</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: '1.25rem' }}>Create your first email template using the builder.</div>
          <Link to="/templates/new/builder" className="btn-primary">
            <Plus size={14} /> Create Template
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {filtered.map((t, i) => {
            const c = TEMPLATE_COLORS[i % TEMPLATE_COLORS.length];
            return (
              <div
                key={t._id}
                style={{
                  background: '#fff', border: '1px solid var(--border)', borderRadius: '12px',
                  padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  cursor: 'default',
                }}
              >
                <div>
                  {/* Icon row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '10px',
                      background: c.bg, border: `1px solid ${c.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.25rem',
                    }}>{c.emoji}</div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <span className="badge badge-blue capitalize" style={{ fontSize: '0.625rem' }}>{t.category}</span>
                      {t.isSystem && <span className="badge badge-gray" style={{ fontSize: '0.625rem' }}>System</span>}
                    </div>
                  </div>

                  {/* Name + subject */}
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', marginBottom: '0.375rem' }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {t.subject || 'No default subject set'}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.875rem', marginTop: '0.875rem', borderTop: '1px solid #f3f4f6' }}>
                  <button onClick={() => navigate(`/templates/${t._id}/builder`)} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
                    <Edit3 size={13} /> Edit
                  </button>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={() => handleDuplicate(t._id)} title="Duplicate" style={{ padding: '0.375rem', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)' }}>
                      <Copy size={14} />
                    </button>
                    {!t.isSystem && (
                      <button onClick={() => handleDelete(t._id)} title="Delete" style={{ padding: '0.375rem', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
