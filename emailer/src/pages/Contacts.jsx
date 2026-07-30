import React, { useState, useEffect } from 'react';
import { Search, CheckSquare, Square, Filter, Send, RefreshCw, X } from 'lucide-react';
import store from '../store/emailerStore';
import ComposeModal from '../components/ComposeModal';

export default function Contacts({ quota, showToast }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [templates, setTemplates] = useState([]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (sourceFilter) params.source = sourceFilter;
      const list = await store.contacts.list(params);
      setContacts(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
    store.templates.list().then(list => setTemplates(list)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchContacts, 350);
    return () => clearTimeout(t);
  }, [search, sourceFilter]);

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return (
      (!search || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) &&
      (!sourceFilter || c.source === sourceFilter)
    );
  });

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(c => c.id || c._id)));
  };

  const toggle = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const selectedContacts = contacts.filter(c => selectedIds.has(c.id || c._id));

  const handleSend = async (payload) => {
    try {
      const res = await store.send.send(payload);
      if (res.success) {
        showToast('success', `✓ ${res.message || `Sent to ${res.successCount} recipients`}`);
        setIsComposeOpen(false);
        setSelectedIds(new Set());
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to send');
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Contacts</h1>
          <p className="page-subtitle">All job hunters from your ATS — {contacts.length} total</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={fetchContacts}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            className="btn btn-primary"
            disabled={selectedIds.size === 0}
            onClick={() => setIsComposeOpen(true)}
          >
            <Send size={14} /> Send Email ({selectedIds.size})
          </button>
        </div>
      </div>

      <div className="page-container" style={{ paddingTop: 16 }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
            <Search size={14} />
            <input
              placeholder="Search contacts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={13} />
              </button>
            )}
          </div>
          <select
            className="form-select"
            style={{ width: 160 }}
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
          >
            <option value="">All Sources</option>
            <option value="Job Applicant">Job Applicants</option>
            <option value="Talent Pool">Talent Pool</option>
          </select>
          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(99,102,241,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>
                {selectedIds.size} selected
              </span>
              <button onClick={() => setSelectedIds(new Set())} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div style={{ padding: 24 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div className="skeleton" style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 6 }} />
                    <div className="skeleton" style={{ height: 10, width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <h3>No contacts found</h3>
              <p>Upload resumes via the main ATS to see contacts here</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <button className={`check-btn ${selectedIds.size === filtered.length && filtered.length > 0 ? 'checked' : ''}`} onClick={toggleAll}>
                        {selectedIds.size === filtered.length && filtered.length > 0
                          ? <CheckSquare size={16} />
                          : <Square size={16} />}
                      </button>
                    </th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Experience</th>
                    <th>Skills</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const id = c.id || c._id;
                    const isSelected = selectedIds.has(id);
                    return (
                      <tr key={id} className={isSelected ? 'selected' : ''}>
                        <td>
                          <button className={`check-btn ${isSelected ? 'checked' : ''}`} onClick={() => toggle(id)}>
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar">{c.name[0]}</div>
                            <div>
                              <div style={{ color: 'var(--color-text)', fontWeight: 500, fontSize: 13 }}>{c.name}</div>
                              {c.college && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.college}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--color-text-2)' }}>{c.email}</td>
                        <td>{c.experience || 'N/A'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {(c.skills || []).slice(0, 3).map((s, i) => (
                              <span key={i} className="tag">{s}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${c.source === 'Job Applicant' ? 'badge-primary' : 'badge-default'}`}>
                            {c.source}
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
      </div>

      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        selectedContacts={selectedContacts}
        quota={quota}
        templates={templates}
        onSend={handleSend}
      />
    </>
  );
}
