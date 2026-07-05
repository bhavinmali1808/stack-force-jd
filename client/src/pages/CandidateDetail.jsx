import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { candidatesAPI, rolesAPI } from '../api/index.js';
import MatchBar from '../components/MatchBar.jsx';
import SkillBreakdown from '../components/SkillBreakdown.jsx';
import StatusPipeline from '../components/StatusPipeline.jsx';
import ResumeViewer from '../components/ResumeViewer.jsx';

export default function CandidateDetail() {
  const { id: roleId, cid } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [fetchingLinkedIn, setFetchingLinkedIn] = useState(false);

  useEffect(() => {
    Promise.all([
      candidatesAPI.get(cid),
      rolesAPI.get(roleId),
    ])
      .then(([cRes, rRes]) => {
        setCandidate(cRes.data.candidate);
        setNotes(cRes.data.candidate.notes || '');
        setRole(rRes.data.role);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cid, roleId]);

  const handleStatusChange = async (newStatus) => {
    setSavingStatus(true);
    try {
      const res = await candidatesAPI.updateStatus(cid, { status: newStatus, notes });
      setCandidate(res.data.candidate);
    } catch (err) {
      alert('Status update failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await candidatesAPI.updateStatus(cid, { status: candidate.status, notes });
      setCandidate(res.data.candidate);
    } catch (err) {
      alert('Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Remove this candidate permanently?')) return;
    try {
      await candidatesAPI.delete(cid);
      navigate(`/roles/${roleId}`);
    } catch (err) {
      alert('Delete failed.');
    }
  };

  const handleFetchLinkedIn = async () => {
    if (!linkedinUrl.trim()) return alert('Please enter a LinkedIn URL');
    setFetchingLinkedIn(true);
    try {
      const res = await candidatesAPI.fetchLinkedIn(roleId, cid, linkedinUrl);
      setCandidate(res.data.candidate);
      setLinkedinUrl('');
    } catch (err) {
      alert('Failed to fetch LinkedIn profile: ' + (err.response?.data?.message || err.message));
    } finally {
      setFetchingLinkedIn(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <div className="skeleton" style={{ height: 24, width: '40%', marginBottom: '1rem' }} />
          <div className="candidate-detail-layout">
            <div className="card skeleton" style={{ height: 500 }} />
            <div className="card skeleton" style={{ height: 500 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <span className="empty-state-icon">❌</span>
            <p>Candidate not found.</p>
            <Link to={`/roles/${roleId}`} className="btn btn-secondary">← Back to Role</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 1200 }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <Link to="/dashboard" style={{ color: 'var(--accent-light)' }}>Dashboard</Link>
          <span>/</span>
          <Link to={`/roles/${roleId}`} style={{ color: 'var(--accent-light)' }}>{role?.title}</Link>
          <span>/</span>
          <span>{candidate.name}</span>
        </div>

        <div className="candidate-detail-layout">
          {/* Left — Resume viewer */}
          <div className="card" style={{ padding: '1.25rem', overflow: 'hidden' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.95rem' }}>Resume Preview</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{candidate.resumeFilename}</span>
            </div>
            <div style={{ height: 'calc(100% - 50px)' }}>
              <ResumeViewer resumeUrl={candidate.resumeUrl} />
            </div>
          </div>

          {/* Right — Details panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'auto' }}>
            {/* Candidate header */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, hsl(${(candidate.name?.charCodeAt(0) || 0) * 7 % 360}, 60%, 40%), hsl(${(candidate.name?.charCodeAt(0) || 0) * 11 % 360}, 70%, 55%))`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem', fontWeight: 700, color: '#fff',
                }}>
                  {candidate.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h2 style={{ fontSize: '1.1rem' }}>{candidate.name}</h2>
                    {candidate.hasMissingMustHave && (
                      <span className="badge badge-red" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>⚠️ Missing Must-Haves</span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {candidate.email} {candidate.phone && `· ${candidate.phone}`}
                  </p>
                </div>
                <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑</button>
              </div>

              {/* Phase 2: Metadata */}
              <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {candidate.college && <div style={{ flex: 1 }}><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>College</span><span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{candidate.college}</span></div>}
                {candidate.cgpa !== null && <div style={{ flex: 1 }}><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>CGPA</span><span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{candidate.cgpa}/10</span></div>}
                {candidate.yearsOfExperience !== null && <div style={{ flex: 1 }}><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Experience</span><span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{candidate.yearsOfExperience} yrs</span></div>}
              </div>

              {candidate.aiScore != null && (
                <p style={{ fontSize: '0.75rem', color: 'var(--accent-light)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>✨</span> AI Scored
                </p>
              )}
              <MatchBar score={candidate.matchScore} />
            </div>

            {/* Pipeline */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Candidate Pipeline</h3>
              <StatusPipeline
                currentStatus={candidate.status}
                onStatusChange={handleStatusChange}
                disabled={savingStatus}
              />
            </div>

            {/* Phase 3: AI Insights */}
            {(candidate.aiSummary || candidate.aiReasoning) && (
              <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--accent-light)', background: 'linear-gradient(145deg, rgba(59,130,246,0.05) 0%, rgba(59,130,246,0.02) 100%)' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-light)' }}>
                  <span>✨</span> AI Insights
                </h3>
                {candidate.aiSummary && (
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Summary</p>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>{candidate.aiSummary}</p>
                  </div>
                )}
                {candidate.aiReasoning && (
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Scoring Reasoning</p>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>{candidate.aiReasoning}</p>
                  </div>
                )}
              </div>
            )}

            {/* Skill breakdown */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Skill Breakdown</h3>
              <SkillBreakdown candidate={candidate} />
            </div>

            {/* Phase 4: LinkedIn Scraping Data */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-light)' }}>
                <span>🔗</span> LinkedIn Profile
              </h3>
              
              {!candidate.linkedinData ? (
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>No LinkedIn data fetched yet.</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="url" 
                      className="form-input" 
                      placeholder="https://linkedin.com/in/username" 
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                    />
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={handleFetchLinkedIn}
                      disabled={fetchingLinkedIn}
                    >
                      {fetchingLinkedIn ? 'Fetching...' : 'Fetch'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{candidate.linkedinData.currentTitle}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{candidate.linkedinData.currentCompany} · {candidate.linkedinData.location}</p>
                    </div>
                    <a href={candidate.linkedinData.profileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem' }}>
                      View on LinkedIn ↗
                    </a>
                  </div>
                  
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>About</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{candidate.linkedinData.about}</p>
                  </div>

                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Verified Skills</p>
                    <div className="skill-pills">
                      {candidate.linkedinData.skills?.map(s => (
                        <span key={s} className="skill-pill" style={{ opacity: 0.8 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Experience History</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {candidate.linkedinData.experience?.map((exp, i) => (
                        <div key={i} style={{ fontSize: '0.8rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--border)' }}>
                          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{exp.title}</p>
                          <p style={{ color: 'var(--text-secondary)' }}>{exp.company} <span style={{ color: 'var(--text-muted)' }}>({exp.duration})</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Recruiter Notes</h3>
              <textarea
                className="form-input"
                placeholder="Add notes about this candidate..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ minHeight: 100, marginBottom: '0.75rem' }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSaveNotes}
                disabled={savingNotes}
              >
                {savingNotes ? 'Saving...' : '✓ Save Notes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
