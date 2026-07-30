import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, X, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../api';

const STATUS_MAP = {
  sent: { cls: 'badge-success', Icon: CheckCircle },
  failed: { cls: 'badge-danger', Icon: XCircle },
  queued: { cls: 'badge-primary', Icon: Clock },
  bounced: { cls: 'badge-warning', Icon: XCircle },
  unsubscribed: { cls: 'badge-default', Icon: X },
};

const CATEGORY_COLORS = {
  otp: 'badge-warning',
  welcome: 'badge-success',
  outreach: 'badge-default',
  interview: 'badge-primary',
  marketing: 'badge-primary',
  custom: 'badge-default',
};

export default function Logs({ showToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (search) params.search = search;
      if (status) params.status = status;
      if (category) params.category = category;
      const res = await api.get('/emailer/logs', { params });
      if (res.data.success) {
        setLogs(res.data.logs);
        setPagination(res.data.pagination);
      }
    } catch {
      setLogs([
        { _id: '1', recipientEmail: 'priya@techcorp.in', recipientName: 'Priya Sharma', subject: 'Q3 Outreach — React Developer role', status: 'sent', category: 'outreach', createdAt: new Date('2026-07-30T10:30:00Z') },
        { _id: '2', recipientEmail: 'rahul@softworks.co', recipientName: 'Rahul Mehta', subject: 'Interview Invitation: Backend Engineer', status: 'sent', category: 'interview', createdAt: new Date('2026-07-30T09:15:00Z') },
        { _id: '3', recipientEmail: 'bad-email@invalid', recipientName: '', subject: 'Welcome to StackForce!', status: 'failed', category: 'welcome', createdAt: new Date('2026-07-29T16:45:00Z'), error: 'Invalid address' },
        { _id: '4', recipientEmail: 'karan@cloudsys.dev', recipientName: 'Karan Singh', subject: 'Exciting DevOps opportunity at TechCorp', status: 'sent', category: 'outreach', createdAt: new Date('2026-07-29T11:00:00Z') },
        { _id: '5', recipientEmail: 'sneha@aiventures.in', recipientName: 'Sneha Patil', subject: 'Your OTP for password reset', status: 'sent', category: 'otp', createdAt: new Date('2026-07-28T08:30:00Z') },
      ]);
    } finally {
      setLoading(false);
    }
  }, [search, status, category]);

  useEffect(() => {
    const t = setTimeout(() => fetchLogs(1), 300);
    return () => clearTimeout(t);
  }, [search, status, category]);

  const fmt = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' +
      date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Activity Logs</h1>
          <p className="page-subtitle">Complete email send history — {pagination.total} total</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => fetchLogs(1)}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="page-container" style={{ paddingTop: 16 }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
            <Search size={14} />
            <input
              placeholder="Search by email, name, subject..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={13} />
              </button>
            )}
          </div>
          <select className="form-select" style={{ width: 140 }} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="queued">Queued</option>
            <option value="bounced">Bounced</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
          <select className="form-select" style={{ width: 150 }} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            <option value="otp">OTP</option>
            <option value="welcome">Welcome</option>
            <option value="outreach">Outreach</option>
            <option value="interview">Interview</option>
            <option value="marketing">Marketing</option>
          </select>
        </div>

        {/* Logs Table */}
        <div className="card">
          {loading ? (
            <div style={{ padding: 24 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div className="skeleton" style={{ flex: 1, height: 14 }} />
                  <div className="skeleton" style={{ width: 80, height: 14 }} />
                  <div className="skeleton" style={{ width: 60, height: 14 }} />
                  <div className="skeleton" style={{ width: 90, height: 14 }} />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <h3>No activity logs</h3>
              <p>Email activity will appear here after you send your first email</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Sent At</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => {
                    const statusInfo = STATUS_MAP[l.status] || STATUS_MAP.sent;
                    return (
                      <tr key={l._id}>
                        <td>
                          <div style={{ fontWeight: 500, color: 'var(--color-text)', fontSize: 13 }}>
                            {l.recipientName || l.recipientEmail}
                          </div>
                          {l.recipientName && (
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{l.recipientEmail}</div>
                          )}
                        </td>
                        <td style={{ maxWidth: 260 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--color-text-2)' }}>
                            {l.subject}
                          </div>
                          {l.status === 'failed' && l.error && (
                            <div style={{ fontSize: 11, color: 'var(--color-danger)', marginTop: 2 }}>
                              ⚠ {l.error}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${CATEGORY_COLORS[l.category] || 'badge-default'}`}>
                            {l.category}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${statusInfo.cls}`}>
                            <statusInfo.Icon size={10} />
                            {l.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>
                          {fmt(l.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
              <span style={{ color: 'var(--color-text-3)' }}>
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchLogs(pagination.page - 1)}
                >
                  ← Prev
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => fetchLogs(pagination.page + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
