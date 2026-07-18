import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { rolesAPI, candidatesAPI } from '../api/index.js';
import CandidateCard from '../components/CandidateCard.jsx';
import AutoSuggestPanel from '../components/AutoSuggestPanel.jsx';
import UploadModal from '../components/UploadModal.jsx';

const STATUS_FILTERS = ['All', 'Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];

export default function RoleDetail() {
  const { id } = useParams();
  const [role, setRole] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [mustHaveOnly, setMustHaveOnly] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const fetchCandidates = async (filters = {}) => {
    try {
      const params = { sortBy: 'matchScore', order: 'desc' };
      if (filters.status && filters.status !== 'All') params.status = filters.status;
      if (filters.search) params.search = filters.search;
      if (filters.mustHaveOnly) params.mustHaveOnly = true;
      const res = await candidatesAPI.list(id, params);
      setRole(res.data.role);
      setCandidates(res.data.candidates);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCandidates(); }, [id]);

  useEffect(() => {
    const t = setTimeout(() => fetchCandidates({ search, status: statusFilter, mustHaveOnly }), 300);
    return () => clearTimeout(t);
  }, [search, statusFilter, mustHaveOnly]);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const res = await candidatesAPI.export(id, format);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shortlist-${role?.title?.replace(/\s+/g, '-') || id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setExporting(false);
    }
  };

  const avgScore = candidates.length
    ? Math.round(candidates.reduce((s, c) => s + (c.matchScore || 0), 0) / candidates.length)
    : 0;

  const toggleSelectAll = () => {
    if (selectedIds.length === candidates.length && candidates.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(candidates.map(c => c._id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const highCount = candidates.filter((c) => c.matchScore >= 80).length;
  const midCount = candidates.filter((c) => c.matchScore >= 50 && c.matchScore < 80).length;

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <div className="skeleton" style={{ height: 32, width: '40%', marginBottom: '1.5rem' }} />
          <div className="candidates-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card" style={{ padding: '1.25rem', height: 200 }}>
                <div className="skeleton" style={{ height: 44, width: 44, borderRadius: '50%', marginBottom: '0.75rem' }} />
                <div className="skeleton" style={{ height: 16, width: '70%', marginBottom: '0.5rem' }} />
                <div className="skeleton" style={{ height: 8, borderRadius: 9999 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <UploadModal 
        isOpen={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
        onUploadComplete={() => fetchCandidates({ search, status: statusFilter, mustHaveOnly })} 
      />
      <div className="page" style={{ padding: '2rem 2.5rem', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <Link to="/dashboard" style={{ color: 'var(--accent-light)' }}>Dashboard</Link>
          <span>/</span>
          <span>{role?.title}</span>
        </div>

        {/* Role Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem' }}>{role?.title}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              📍 {role?.location} · {role?.experienceLevel} · {candidates.length} candidates
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link to={`/roles/${id}/analytics`} className="btn btn-secondary btn-sm" style={{ color: 'var(--accent-light)', borderColor: 'var(--accent-light)' }}>
              📊 Analytics
            </Link>
            <Link to={`/roles/${id}/edit`} className="btn btn-secondary btn-sm" style={{ background: '#fff' }}>
              ✏️ Edit
            </Link>
            <button className="btn btn-primary btn-sm" style={{ background: '#4F46E5', color: '#fff', border: 'none' }} onClick={() => setUploadModalOpen(true)}>
              ⬆ Bulk Upload
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleExport('csv')} disabled={exporting || !candidates.length}>
              {exporting ? '...' : '⬇ CSV'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleExport('pdf')} disabled={exporting || !candidates.length}>
              {exporting ? '...' : '⬇ PDF'}
            </button>
          </div>
        </div>

        {/* Stats strip */}
        {candidates.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total', value: candidates.length, color: 'var(--accent-light)' },
              { label: 'Strong (80%+)', value: highCount, color: 'var(--success)' },
              { label: 'Moderate', value: midCount, color: 'var(--warning)' },
              { label: 'Avg Score', value: `${avgScore}%`, color: 'var(--text-primary)' },
            ].map((s) => (
              <div key={s.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.875rem', textAlign: 'center' }}>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search + Filter */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, email, or college..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 300 }}
            id="search-candidates"
          />
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <input
              type="checkbox" id="must-have-only"
              checked={mustHaveOnly}
              onChange={(e) => setMustHaveOnly(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--success)' }}
            />
            <label htmlFor="must-have-only" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Must-haves only 🔴
            </label>
          </div>
        </div>

        {/* Auto-Suggest from Talent Pool */}
        <AutoSuggestPanel roleId={id} onCandidateAdded={fetchCandidates} />

        {/* Candidates Table */}
        {candidates.length === 0 ? (
          <div className="empty-state card" style={{ background: '#fff', borderRadius: '12px' }}>
            <span className="empty-state-icon">👥</span>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No candidates match</p>
            <p style={{ fontSize: '0.875rem' }}>Upload resumes to start building your shortlist.</p>
            <button onClick={() => setUploadModalOpen(true)} className="btn btn-primary">⬆ Bulk Upload</button>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                  <th style={{ padding: '1rem 1.5rem', width: '60px' }}>
                    <input type="checkbox" checked={candidates.length > 0 && selectedIds.length === candidates.length} onChange={toggleSelectAll} style={{ width: 16, height: 16 }} />
                  </th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#4B5563' }}>Name</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#4B5563' }}>Current Role</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#4B5563' }}>Experience</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#4B5563' }}>Match Score</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#4B5563' }}>Location</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#4B5563' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(candidate => {
                  const nameStr = candidate.name || 'Unknown Candidate';
                  const expStr = candidate.yearsOfExperience != null ? `${candidate.yearsOfExperience} yrs` : '-';
                  const locationStr = candidate.location || '-';
                  
                  return (
                    <tr 
                      key={candidate._id} 
                      style={{ borderBottom: '1px solid #E5E7EB', transition: 'background 0.2s', background: selectedIds.includes(candidate._id) ? '#F3F4F6' : 'transparent' }}
                    >
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <input type="checkbox" checked={selectedIds.includes(candidate._id)} onChange={() => toggleSelect(candidate._id)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ 
                            width: 32, height: 32, borderRadius: '50%', background: '#4F46E5', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem'
                          }}>
                            {nameStr[0]?.toUpperCase()}
                          </div>
                          <div>
                            <Link to={`/roles/${id}/candidates/${candidate._id}`} style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem', textDecoration: 'none' }}>{nameStr}</Link>
                            <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>{candidate.email || 'No email'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151' }}>{candidate.currentRole || candidate.title || 'Unknown Role'}</div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: '#4B5563' }}>
                        {expStr}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           <div style={{ width: 60, height: 6, background: '#E5E7EB', borderRadius: 999, overflow: 'hidden' }}>
                              <div style={{ width: `${candidate.matchScore || 0}%`, height: '100%', background: (candidate.matchScore >= 80 ? '#10B981' : candidate.matchScore >= 50 ? '#F59E0B' : '#EF4444') }} />
                           </div>
                           <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>{candidate.matchScore || 0}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: '#6B7280' }}>
                        {locationStr}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span className={`badge badge-${candidate.status === 'Rejected' ? 'red' : candidate.status === 'Shortlisted' ? 'green' : 'gray'}`}>
                          {candidate.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
