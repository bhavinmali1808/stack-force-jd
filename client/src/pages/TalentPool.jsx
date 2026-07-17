/**
 * TalentPool.jsx — Company Resume Database
 * Upload all resumes once. The system parses and stores them.
 * Any role can then auto-match from this pool instantly.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useUploadQueue } from '../hooks/useUploadQueue.js';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const token = () => localStorage.getItem('sf_token');
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

// Pool-specific upload hook (presigns to /api/pool/presign)
function usePoolUpload(companyId) {
  const [total, setTotal] = useState(0);
  const [uploaded, setUploaded] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [liveNames, setLiveNames] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    const socket = io(API, { transports: ['websocket'] });
    socket.on('connect', () => socket.emit('join-company', companyId));
    socket.on('pool:resume-processed', (data) => {
      setProcessed((n) => n + 1);
      setLiveNames((prev) => [data.name, ...prev].slice(0, 100));
    });
    return () => socket.disconnect();
  }, [companyId]);

  const startUpload = useCallback(async (files) => {
    setTotal(files.length); setUploaded(0); setProcessed(0);
    setIsUploading(true); setError(null); setLiveNames([]);
    try {
      const { data } = await axios.post(`${API}/api/pool/presign`,
        { files: files.map(f => ({ name: f.name, size: f.size })) },
        { headers: authHeaders() });

      const BATCH = 10;
      for (let i = 0; i < data.tokens.length; i += BATCH) {
        await Promise.all(data.tokens.slice(i, i + BATCH).map(async ({ uploadUrl }, j) => {
          const file = files[i + j];
          const form = new FormData(); form.append('file', file);
          try {
            await axios.put(`${API}${uploadUrl}`, form, { headers: authHeaders() });
            setUploaded(n => n + 1);
          } catch { /* individual failures are non-fatal */ }
        }));
      }
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setIsUploading(false); }
  }, []);

  const reset = useCallback(() => {
    setTotal(0);
    setUploaded(0);
    setProcessed(0);
    setLiveNames([]);
    setError(null);
  }, []);

  const progress = total > 0 ? Math.round(((uploaded * 0.5 + processed * 0.5) / total) * 100) : 0;
  return { startUpload, reset, total, uploaded, processed, isUploading, liveNames, error, progress, isDone: total > 0 && processed >= uploaded && !isUploading };
}

export default function TalentPool() {
  const [stats, setStats] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const companyId = JSON.parse(atob(localStorage.getItem('sf_token')?.split('.')[1] || 'e30='))?.id;

  const { startUpload, reset, total, uploaded, processed, isUploading, liveNames, error, progress, isDone } = usePoolUpload(companyId);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API}/api/pool/stats`, { headers: authHeaders() });
      setStats(data);
    } catch {}
  };

  const fetchResumes = async (p = 1, s = '') => {
    try {
      const { data } = await axios.get(`${API}/api/pool`, {
        params: { page: p, limit: 30, search: s, status: 'done' },
        headers: authHeaders(),
      });
      setResumes(data.resumes);
      setTotalPages(data.pages);
    } catch {}
  };

  useEffect(() => { fetchStats(); fetchResumes(); }, []);

  useEffect(() => {
    if (isDone) { fetchStats(); fetchResumes(); setFiles([]); }
  }, [isDone]);

  useEffect(() => {
    const t = setTimeout(() => fetchResumes(1, search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(f => /\.(pdf|docx?|txt)$/i.test(f.name));
    setFiles(prev => [...prev, ...dropped.filter(f => !prev.find(p => p.name === f.name))]);
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove from pool?')) return;
    await axios.delete(`${API}/api/pool/${id}`, { headers: authHeaders() });
    fetchResumes(page, search); fetchStats();
  };

  const isActive = isUploading || (total > 0 && processed < uploaded);

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2rem' }}>🗄️</span>
            <h1 style={{ fontSize: '2rem' }}>Talent Pool</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', maxWidth: 600 }}>
            Upload your entire resume database once. The system parses and stores everything.
            When you open any role, it auto-suggests the best matches from this pool instantly.
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
            {[
              { label: 'Total Resumes', value: stats.total, icon: '📄', color: 'var(--accent-light)' },
              { label: 'Parsed & Ready', value: stats.done, icon: '✅', color: 'var(--success)' },
              { label: 'In Queue', value: stats.queued + stats.processing, icon: '⚙️', color: 'var(--warning)' },
              { label: 'Failed', value: stats.failed, icon: '❌', color: stats.failed > 0 ? 'var(--danger)' : 'var(--text-muted)' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{s.icon}</div>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Upload Panel */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>📤 Upload Resumes</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Drop up to 5,000 resumes. Files upload in parallel batches — parsed async by Python parser.
            </p>

            {!isActive && !isDone && (
              <div
                onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                style={{
                  border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)',
                  padding: '2rem', textAlign: 'center', cursor: 'pointer',
                  background: 'var(--bg-secondary)', marginBottom: '1rem',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>☁️</div>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Drag & drop resumes</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>PDF, DOCX, TXT — up to 5,000 files</p>
                <label style={{ display: 'inline-block', marginTop: '0.75rem', cursor: 'pointer' }}>
                  <input type="file" multiple accept=".pdf,.docx,.doc,.txt" style={{ display: 'none' }}
                    onChange={e => {
                      const newFiles = Array.from(e.target.files);
                      setFiles(prev => [...prev, ...newFiles.filter(f => !prev.find(p => p.name === f.name))]);
                    }} />
                  <span className="btn btn-secondary btn-sm">Browse files</span>
                </label>
              </div>
            )}

            {files.length > 0 && !isActive && !isDone && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{files.length} files ready</p>
                  <button className="btn btn-ghost btn-sm" onClick={() => setFiles([])}>Clear</button>
                </div>
                {error && <p style={{ color: 'var(--danger)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>❌ {error}</p>}
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => startUpload(files)}>
                  ⚡ Upload {files.length} to Talent Pool
                </button>
              </div>
            )}

            {/* Progress */}
            {isActive && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {isUploading ? '📤 Uploading...' : '🐍 Python parser running...'}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-light)' }}>{progress}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 9999, overflow: 'hidden', marginBottom: '1rem' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', transition: 'width 0.3s' }} />
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Uploaded {uploaded}/{total} · Parsed {processed}/{total}
                </p>
                {liveNames.length > 0 && (
                  <div style={{ marginTop: '0.75rem', maxHeight: 160, overflowY: 'auto' }}>
                    {liveNames.map((name, i) => (
                      <div key={i} style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: 4, marginBottom: '0.2rem' }}>
                         {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isDone && (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ fontSize: '2.5rem' }}>🎉</div>
                <p style={{ fontWeight: 700, color: 'var(--success)', marginTop: '0.5rem' }}>{processed} resumes added to pool!</p>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => { setFiles([]); reset(); }}>Upload More</button>
              </div>
            )}
          </div>

          {/* Top Skills in Pool */}
          {stats?.topSkills?.length > 0 && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}> Top Skills in Pool</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stats.topSkills.slice(0, 12).map(({ skill, count }) => (
                  <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: 120, textTransform: 'capitalize' }}>{skill}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round((count / stats.topSkills[0].count) * 100)}%`, background: 'var(--accent)', borderRadius: 9999 }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 30, textAlign: 'right' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pool Resume Table */}
        {stats?.done > 0 && (
          <div className="card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>📋 Pool Resumes ({stats.done} parsed)</h3>
              <input className="form-input" placeholder="Search by name, college..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ maxWidth: 260 }} />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Name', 'Email', 'Skills', 'Exp', 'CGPA', 'College', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.78rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resumes.map(r => (
                    <tr key={r._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{r.email || '—'}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <span style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-light)', borderRadius: 9999, padding: '0.15rem 0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
                          {r.extractedSkills?.length || 0} skills
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{r.yearsOfExperience != null ? `${r.yearsOfExperience}y` : '—'}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{r.cgpa ?? '—'}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.college || '—'}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <button className="btn btn-ghost btn-icon" style={{ fontSize: '0.75rem', color: 'var(--danger)' }} onClick={() => handleDelete(r._id)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => { setPage(p => p - 1); fetchResumes(page - 1, search); }}>← Prev</button>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Page {page} of {totalPages}</span>
                <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => { setPage(p => p + 1); fetchResumes(page + 1, search); }}>Next →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
