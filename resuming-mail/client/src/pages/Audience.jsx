import React, { useState, useEffect } from 'react';
import { Users, Search, Trash2, ChevronDown, Download, Filter, UserPlus } from 'lucide-react';
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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Audience</h1>
          <p className="page-subtitle">Manage and segment your subscriber list from Resuming.io</p>
        </div>
        <button className="btn-primary"><UserPlus size={14} /> Import Contacts</button>
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
        <button className="btn-ghost"><Filter size={13} /> Filter</button>
        <button className="btn-ghost"><Download size={13} /> Export</button>
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
                        <Avatar name={`${c.firstName} ${c.lastName}`} email={c.email} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '0.8125rem' }}>{c.firstName} {c.lastName}</div>
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
    </div>
  );
}
