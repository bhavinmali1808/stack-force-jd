import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { candidatesAPI, rolesAPI } from '../api/index.js';
import { ExternalLink, MessageSquare, Briefcase, GraduationCap, MapPin, Mail, Phone, FileText, ArrowLeft, Send } from 'lucide-react';

export default function CandidateDetail({ candidateId, roleIdProp, onClose, initialCandidate }) {
  const { id: roleIdParam, cid } = useParams();
  const navigate = useNavigate();
  const roleId = roleIdProp || roleIdParam;
  const targetCid = candidateId || cid;
  
  const [candidate, setCandidate] = useState(initialCandidate || null);
  const [role, setRole] = useState(initialCandidate?.role && typeof initialCandidate.role === 'object' ? initialCandidate.role : null);
  const [loading, setLoading] = useState(!initialCandidate);
  const [activeTab, setActiveTab] = useState('Overview');
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    if (!targetCid) return;
    if (!initialCandidate) setLoading(true);
    Promise.all([
      candidatesAPI.get(targetCid),
      roleId ? rolesAPI.get(roleId) : Promise.resolve({ data: { role: null } }),
    ])
      .then(([cRes, rRes]) => {
        setCandidate(cRes.data.candidate);
        if (rRes.data.role) setRole(rRes.data.role);
        else if (cRes.data.candidate.role && typeof cRes.data.candidate.role === 'object') setRole(cRes.data.candidate.role);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [targetCid, roleId]);

  const handleStatusChange = async (newStatus) => {
    setSavingStatus(true);
    try {
      const res = await candidatesAPI.updateStatus(targetCid, { status: newStatus });
      setCandidate(res.data.candidate);
    } catch (err) {
      alert('Status update failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className={onClose ? '' : 'page'} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="container" style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 24, width: '40%', marginBottom: '1rem' }} />
          <div className="card skeleton" style={{ height: 500 }} />
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className={onClose ? '' : 'page'} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="empty-state">
            <span className="empty-state-icon">❌</span>
            <p>Candidate not found.</p>
            {!onClose && <Link to={`/roles/${roleId}`} className="btn btn-secondary">← Back to Role</Link>}
          </div>
        </div>
      </div>
    );
  }

  const nameStr = candidate.name || 'Unknown Candidate';
  const titleStr = candidate.title || (role?.title ? `Applied to: ${role.title}` : '');
  // candidate.company is an ObjectId ref — only show if it's a human-readable string
  const isObjectId = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);
  const companyStr = candidate.company && !isObjectId(candidate.company)
    ? candidate.company
    : (role?.title || '');

  const locationStr = candidate.location || 'Remote';
  const avatarUrl = candidate.avatar || `https://i.pravatar.cc/150?u=${candidate._id}`;

  return (
    <div className={onClose ? '' : 'page'} style={{ background: '#FAFBFD', minHeight: '100%', height: onClose ? '100%' : 'auto', paddingTop: onClose ? '1rem' : '2rem', overflowY: 'auto' }}>
      <div className="container" style={{ maxWidth: 1000, margin: '0 auto', padding: onClose ? '0 1.5rem' : undefined }}>
        
        {/* Header Navigation */}
        <button onClick={() => onClose ? onClose() : navigate(-1)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#6B7280', marginBottom: '1.5rem', padding: 0 }}>
          <ArrowLeft size={18} /> {onClose ? 'Close' : 'Back'}
        </button>

        {/* Profile Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <img src={avatarUrl} alt={nameStr} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>{nameStr}</h1>
                {candidate.yearsOfExperience != null && (
                  <span style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 500 }}>{candidate.yearsOfExperience} yrs</span>
                )}
              </div>
              <p style={{ fontSize: '0.95rem', color: '#4B5563', margin: '0 0 0.25rem 0', fontWeight: 500 }}>
                {titleStr} at <span style={{ color: '#111827' }}>{companyStr}</span>
              </p>
              <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <MapPin size={14} /> {locationStr}
              </p>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <span className="badge" style={{ background: '#EDE9FE', color: '#6D28D9', fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>⚡ Rule-Based Match</span>
                {candidate.matchScore >= 80 && (
                  <span className="badge" style={{ background: '#DCFCE7', color: '#166534', fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>Highly Recommended</span>
                )}
                {candidate.hasMissingMustHave && (
                  <span className="badge" style={{ background: '#FEE2E2', color: '#991B1B', fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>⚠ Missing Must-Haves</span>
                )}
              </div>
              
              <div style={{ marginTop: '1rem', width: '250px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: 600 }}>
                  <span style={{ color: '#4B5563' }}>Match Score</span>
                  <span style={{ color: candidate.matchScore >= 80 ? '#10B981' : candidate.matchScore >= 50 ? '#F59E0B' : '#EF4444' }}>
                    {candidate.matchScore}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${candidate.matchScore}%`, 
                    background: candidate.matchScore >= 80 ? '#10B981' : candidate.matchScore >= 50 ? '#F59E0B' : '#EF4444',
                    transition: 'width 1s ease-in-out'
                  }} />
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <a href={candidate.linkedinUrl || '#'} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-icon" title="View LinkedIn" style={{ padding: '0.5rem' }}>
              <ExternalLink size={18} />
            </a>
            <a href={candidate.portfolioUrl || '#'} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-icon" title="View Portfolio" style={{ padding: '0.5rem' }}>
              <Briefcase size={18} />
            </a>
            <button className="btn btn-secondary btn-icon" title="Chat" style={{ padding: '0.5rem' }}>
              <MessageSquare size={18} />
            </button>
            <button onClick={() => navigate('/email')} className="btn" style={{ background: '#F3F4F6', color: '#4F46E5', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
              <Send size={16} /> Start Outreach
            </button>
            <button 
              className="btn btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: candidate.status === 'Shortlisted' ? '#10B981' : '#4F46E5' }}
              onClick={() => handleStatusChange(candidate.status === 'Shortlisted' ? 'Applied' : 'Shortlisted')}
              disabled={savingStatus}
            >
              {candidate.status === 'Shortlisted' ? '✓ Shortlisted' : 'Shortlist'}
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid #E5E7EB', marginBottom: '1.5rem' }}>
          {['Overview', 'Experience', 'Education'].map(tab => (
            <button 
              key={tab}
              style={{ 
                padding: '0.75rem 0', background: 'none', border: 'none', 
                borderBottom: activeTab === tab ? '2px solid #4F46E5' : '2px solid transparent',
                color: activeTab === tab ? '#4F46E5' : '#6B7280',
                fontWeight: activeTab === tab ? 600 : 500,
                cursor: 'pointer', fontSize: '0.95rem'
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '1.5rem' }}>
          
          {activeTab === 'Overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Contact Information */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '1rem' }}>Contact Information</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <a href={candidate.linkedinUrl || '#'} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: '0.85rem' }}>
                    <ExternalLink size={16} color="#0A66C2" /> View LinkedIn
                  </a>
                  <a href={candidate.portfolioUrl || '#'} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: '0.85rem' }}>
                    <Briefcase size={16} color="#4F46E5" /> Portfolio
                  </a>
                  {candidate.resumeUrl && (
                    <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: '0.85rem' }}>
                      <FileText size={16} color="#4F46E5" /> View Resume
                    </a>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                    <Mail size={16} color="#10B981" /> {candidate.email || 'No email provided'}
                  </div>
                  {candidate.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                      <Phone size={16} color="#8B5CF6" /> {candidate.phone}
                    </div>
                  )}
                </div>
              </div>

              {/* Extracted Skills */}
              {candidate.extractedSkills && candidate.extractedSkills.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '1rem' }}>Extracted Skills</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {candidate.extractedSkills.slice(0, 12).map(skill => (
                      <span key={skill} style={{ background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE', borderRadius: '20px', padding: '0.3rem 0.8rem', fontSize: '0.85rem', fontWeight: 500 }}>
                        {skill}
                      </span>
                    ))}
                    {candidate.extractedSkills.length > 12 && (
                      <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: '20px', padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}>
                        +{candidate.extractedSkills.length - 12} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Skill Match Analysis — Rule-Based */}
              <div style={{ background: '#FAFAF9', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1F2937', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  ⚡ Skill Match Analysis
                </h3>

                {/* Must-Have Skills */}
                {(candidate.mustHaveMatched?.length > 0 || candidate.mustHaveMissing?.length > 0) && (
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Must-Have Skills (60% weight)</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {(candidate.mustHaveMatched || []).map(s => (
                        <span key={s} style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', borderRadius: '20px', padding: '0.2rem 0.7rem', fontSize: '0.8rem', fontWeight: 500 }}>✓ {s}</span>
                      ))}
                      {(candidate.mustHaveMissing || []).map(s => (
                        <span key={s} style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '20px', padding: '0.2rem 0.7rem', fontSize: '0.8rem', fontWeight: 500 }}>✗ {s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nice-to-Have Skills */}
                {(candidate.niceToHaveMatched?.length > 0 || candidate.niceToHaveMissing?.length > 0) && (
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Nice-to-Have Skills (40% weight)</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {(candidate.niceToHaveMatched || []).map(s => (
                        <span key={s} style={{ background: '#EDE9FE', color: '#5B21B6', border: '1px solid #DDD6FE', borderRadius: '20px', padding: '0.2rem 0.7rem', fontSize: '0.8rem' }}>✓ {s}</span>
                      ))}
                      {(candidate.niceToHaveMissing || []).map(s => (
                        <span key={s} style={{ background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: '20px', padding: '0.2rem 0.7rem', fontSize: '0.8rem' }}>✗ {s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {candidate.hasMissingMustHave && (
                  <p style={{ fontSize: '0.82rem', color: '#DC2626', fontWeight: 600, marginTop: '0.5rem', marginBottom: 0 }}>
                    ⚠ Score capped at 40 — one or more must-have skills are missing from this resume.
                  </p>
                )}
                <p style={{ marginTop: '0.75rem', marginBottom: 0, fontSize: '0.82rem', color: '#6B7280' }}>
                  Scored by StackForce rule-based engine · Must-haves 60% · Nice-to-haves 40%
                </p>
              </div>
            </div>
          )}

          {activeTab === 'Experience' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, padding: '1rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', textAlign: 'center' }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: '0 0 0.25rem 0' }}>
                    {candidate.yearsOfExperience != null ? `${candidate.yearsOfExperience} yrs` : 'Unknown'}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0 }}>Total Experience</p>
                </div>
                <div style={{ flex: 1, padding: '1rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', textAlign: 'center' }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: '0 0 0.25rem 0' }}>1 yr 2 mos</h4>
                  <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0 }}>Average Tenure</p>
                </div>
              </div>
              
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '1.5rem' }}>Experience History</h3>
                
                {/* Simulated Timeline for MVP */}
                <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid #E5E7EB', marginLeft: '1rem' }}>
                  <div style={{ position: 'absolute', width: 12, height: 12, background: '#10B981', borderRadius: '50%', left: -7, top: 4, border: '2px solid #fff' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', margin: '0 0 0.25rem 0' }}>{titleStr} <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>↗ Promoted</span></h4>
                      <p style={{ fontSize: '0.85rem', color: '#4B5563', margin: 0 }}>{companyStr}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0 0 0.25rem 0' }}>Present</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#4B5563', lineHeight: 1.5, marginTop: '0.5rem' }}>
                    As a key contributor, I played a pivotal role in developing, optimizing, and launching multiple projects...
                  </p>
                </div>
                
              </div>
            </div>
          )}

          {activeTab === 'Education' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ padding: '1.5rem', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ padding: '0.5rem', background: '#F3F4F6', borderRadius: '8px' }}>
                    <GraduationCap size={24} color="#4B5563" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', margin: '0 0 0.25rem 0' }}>{candidate.college || 'University Name Not Extracted'}</h4>
                      <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>2019 - 2023</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#4B5563', margin: '0 0 0.5rem 0' }}>Bachelor's Degree</p>
                    {candidate.cgpa && (
                      <p style={{ fontSize: '0.85rem', color: '#4B5563', margin: 0 }}>CGPA: <strong>{candidate.cgpa}</strong></p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
