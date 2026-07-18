import React, { useState, useEffect } from 'react';
import { rolesAPI, candidatesAPI } from '../api/index.js';

export default function UploadModal({ isOpen, onClose, onUploadComplete }) {
  const [uploadType, setUploadType] = useState('project'); // 'project' | 'global'
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [files, setFiles] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen]);

  const fetchRoles = async () => {
    try {
      const res = await rolesAPI.list();
      setRoles(res.data.roles);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) return setError('Please select a file');
    if (uploadType === 'project' && !selectedRole) return setError('Please select a project');

    setUploading(true);
    setError('');

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('resumes', files[i]);
    }

    try {
      if (uploadType === 'project') {
        await candidatesAPI.bulkUpload(selectedRole, formData);
      } else {
        await candidatesAPI.uploadGlobal(formData);
      }
      onUploadComplete && onUploadComplete();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', width: 600, borderRadius: '12px', padding: '2rem', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#9CA3AF' }}>✕</button>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ background: '#EEF2FF', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📄</span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>Who are you uploading for?</h2>
          <p style={{ color: '#6B7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>Select whether to upload to a specific project or directly to the global pool.</p>
        </div>

        {error && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button 
            onClick={() => setUploadType('project')} 
            style={{ flex: 1, padding: '1rem', border: uploadType === 'project' ? '2px solid #4F46E5' : '1px solid #E5E7EB', borderRadius: '8px', background: uploadType === 'project' ? '#EEF2FF' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 500, color: '#111827' }}
          >
            <span style={{ fontSize: '1.2rem' }}>🎯</span> Specific Project
          </button>
          <button 
            onClick={() => setUploadType('global')} 
            style={{ flex: 1, padding: '1rem', border: uploadType === 'global' ? '2px solid #4F46E5' : '1px solid #E5E7EB', borderRadius: '8px', background: uploadType === 'global' ? '#EEF2FF' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 500, color: '#111827' }}
          >
            <span style={{ fontSize: '1.2rem' }}>🌍</span> Global Pool
          </button>
        </div>

        <div style={{ background: '#F8FAFC', padding: '1.5rem', borderRadius: '8px', border: '1px solid #E5E7EB', marginBottom: '2rem' }}>
          {uploadType === 'project' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Select Project</label>
              <select 
                value={selectedRole} 
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #D1D5DB', outline: 'none' }}
              >
                <option value="">Select a project...</option>
                {roles.map(r => (
                  <option key={r._id} value={r._id}>{r.title}</option>
                ))}
              </select>
            </div>
          )}

          <div>
             <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Upload Resumes (PDF/DOCX)</label>
             <input type="file" multiple accept=".pdf,.doc,.docx" onChange={(e) => setFiles(e.target.files)} style={{ width: '100%', padding: '0.75rem', background: '#fff', border: '1px dashed #D1D5DB', borderRadius: '6px' }} />
          </div>
        </div>

        <button onClick={handleUpload} disabled={uploading} style={{ width: '100%', padding: '0.875rem', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}>
          {uploading ? 'Uploading...' : 'Upload Resumes'}
        </button>
      </div>
    </div>
  );
}
