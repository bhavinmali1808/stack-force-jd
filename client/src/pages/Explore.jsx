import React, { useState, useEffect } from 'react';
import { Search, Filter, Trash2, Bell, Loader, X, Upload } from 'lucide-react';
import { candidatesAPI } from '../api/index.js';
import CandidateDetail from './CandidateDetail.jsx';
import UploadModal from '../components/UploadModal.jsx';

export default function Explore() {
  const [selectedIds, setSelectedIds] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [viewingCandidateId, setViewingCandidateId] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Fetch Company Candidates
  useEffect(() => {
    setLoading(true);
    candidatesAPI.getAll()
      .then(res => setCandidates(res.data.candidates || []))
      .catch(err => console.error("Failed to load candidates:", err))
      .finally(() => setLoading(false));
  }, []);

  const displayCandidates = candidates.filter(c => {
    if (!searchKeyword) return true;
    const term = searchKeyword.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.title && c.title.toLowerCase().includes(term)) ||
      (c.company && c.company.toLowerCase().includes(term)) ||
      (c.role?.title && c.role.title.toLowerCase().includes(term))
    );
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === displayCandidates.length && displayCandidates.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayCandidates.map(c => c._id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      setSearchKeyword(keyword);
    }
  };
  
  const handleRejectSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Reject ${selectedIds.length} candidate(s)?`)) return;
    
    setUpdating(true);
    try {
      await Promise.all(selectedIds.map(id => candidatesAPI.updateStatus(id, { status: 'Rejected' })));
      // Update local state
      setCandidates(prev => prev.map(c => selectedIds.includes(c._id) ? { ...c, status: 'Rejected' } : c));
      setSelectedIds([]);
    } catch (err) {
      alert("Failed to reject some candidates");
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkUpload = async (e) => {
    // Legacy file input handler removed in favor of UploadModal
  };

  return (
    <>
      <UploadModal 
        isOpen={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
        onUploadComplete={() => {
          candidatesAPI.getAll().then(res => setCandidates(res.data.candidates || []));
        }} 
      />
    <>
      <div className="main-header" style={{ padding: '0 2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h1 style={{ fontSize: '1.25rem' }}>Global Dataset ({displayCandidates.length})</h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button 
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', background: '#4F46E5', borderRadius: '8px', border: 'none', color: '#fff', fontWeight: 500 }}
            onClick={() => setUploadModalOpen(true)}
          >
            <Upload size={16} /> Bulk Upload
          </button>
          <button className="btn btn-ghost btn-icon" style={{ padding: '0.4rem', color: '#9CA3AF' }}>
            <Bell size={20} />
          </button>
        </div>
      </div>

      <div className="main-body" style={{ padding: '2rem 2.5rem', backgroundColor: '#F8FAFC' }}>
        
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', width: '400px' }}>
            <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder={"Search By Name, Role or Company"} 
              style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.75rem', borderRadius: '8px', background: '#fff', border: '1px solid #E5E7EB' }}
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                if (e.target.value === '') setSearchKeyword(''); // auto-clear
              }}
              onKeyDown={handleSearch}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {selectedIds.length > 0 && (
              <button 
                className="btn btn-danger" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#EF4444', color: '#fff', border: 'none' }}
                onClick={handleRejectSelected}
                disabled={updating}
              >
                <Trash2 size={16} /> Reject Selected ({selectedIds.length})
              </button>
            )}
            <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff' }}>
              <Filter size={16} /> Filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                <th style={{ padding: '1rem 1.5rem', width: '60px' }}>
                  <input type="checkbox" checked={displayCandidates.length > 0 && selectedIds.length === displayCandidates.length} onChange={toggleSelectAll} style={{ width: 16, height: 16 }} />
                </th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#4B5563' }}>Name</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#4B5563' }}>Current Role</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#4B5563' }}>Experience</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#4B5563' }}>Location</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#4B5563' }}>Tags</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <Loader size={18} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> 
                      Loading candidates...
                    </div>
                  </td>
                </tr>
              ) : displayCandidates.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
                    No candidates found in your global dataset.
                  </td>
                </tr>
                  <tr 
                    key={candidate._id} 
                    style={{ borderBottom: '1px solid #E5E7EB', transition: 'background 0.2s', background: selectedIds.includes(candidate._id) ? '#F3F4F6' : 'transparent', cursor: 'pointer' }}
                    onClick={(e) => {
                      if (e.target.type !== 'checkbox') setViewingCandidateId(candidate._id);
                    }}
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
                           <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>{nameStr}</div>
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
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: '#6B7280' }}>
                      {locationStr}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {candidate.extractedSkills?.slice(0, 2).map((tag, i) => (
                           <span key={i} style={{ background: '#EEF2FF', color: '#4F46E5', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #C7D2FE' }}>
                             {tag}
                           </span>
                        )) || '-'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
      
      {/* Slide-out Candidate Detail Drawer */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: viewingCandidateId ? 0 : '-100%',
        width: '100%',
        maxWidth: '850px',
        height: '100vh',
        background: '#fff',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
        transition: 'right 0.3s ease-in-out',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {viewingCandidateId && (
          <CandidateDetail 
            candidateId={viewingCandidateId} 
            initialCandidate={candidates.find(c => c._id === viewingCandidateId)}
            onClose={() => setViewingCandidateId(null)} 
          />
        )}
      </div>
      
      {/* Overlay */}
      {viewingCandidateId && (
        <div 
          onClick={() => setViewingCandidateId(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 999
          }}
        />
      )}
    </>
  );
}
