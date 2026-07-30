import React, { useState, useEffect } from 'react';
import { FileSearch, Search, Eye } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await api.get(`/analytics/logs?email=${search}&status=${statusFilter}`);
      if (res.data.success) setLogs(res.data.logs);
    } catch {
      toast.error('Failed to load email logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Email Delivery Logs</h1>
          <p className="page-subtitle">Real-time audit log of every email dispatched by the system</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9" placeholder="Filter by recipient email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select w-48" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="delivered">Delivered</option>
          <option value="opened">Opened</option>
          <option value="clicked">Clicked</option>
          <option value="bounced">Bounced</option>
          <option value="failed">Failed</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Campaign / Subject</th>
              <th>Status</th>
              <th>Opens / Clicks</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center py-8">Loading logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-slate-500">No email logs found matching query.</td></tr>
            ) : (
              logs.map(l => (
                <tr key={l._id}>
                  <td>
                    <div className="font-semibold text-slate-200">{l.recipientEmail}</div>
                    <div className="text-xs text-slate-400">{l.recipientName || 'Candidate'}</div>
                  </td>
                  <td>
                    <div className="text-xs font-semibold text-indigo-400">{l.campaign?.name || 'Direct / Transactional'}</div>
                    <div className="text-xs text-slate-400 truncate max-w-xs">{l.subject}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      l.status === 'opened' ? 'badge-violet' :
                      l.status === 'clicked' ? 'badge-green' :
                      l.status === 'delivered' ? 'badge-blue' :
                      l.status === 'bounced' ? 'badge-red' : 'badge-gray'
                    } capitalize`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="text-xs text-slate-400">
                    <div>Opens: {l.opens?.length || 0}</div>
                    <div>Clicks: {l.clicks?.length || 0}</div>
                  </td>
                  <td className="text-xs text-slate-400">{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
