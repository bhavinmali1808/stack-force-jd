import React, { useState, useEffect } from 'react';
import { FileSearch, Search, Download, Filter, ChevronDown } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const EVENT_BADGE = {
  delivered:   { cls: 'badge-green',  label: 'Delivered'   },
  opened:      { cls: 'badge-purple', label: 'Opened'      },
  clicked:     { cls: 'badge-blue',   label: 'Clicked'     },
  bounced:     { cls: 'badge-red',    label: 'Bounced'     },
  failed:      { cls: 'badge-red',    label: 'Failed'      },
  unsubscribed:{ cls: 'badge-gray',   label: 'Unsubscribed'},
};

function Avatar({ email }) {
  const ch = (email || 'A')[0].toUpperCase();
  const colors = ['#ede9fe','#dbeafe','#dcfce7','#fce7f3','#fef3c7'];
  const textColors = ['#7c3aed','#2563eb','#059669','#be185d','#d97706'];
  const idx = email ? email.charCodeAt(0) % colors.length : 0;
  return (
    <div style={{ width:30, height:30, borderRadius:'50%', background:colors[idx], color:textColors[idx], display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6875rem', fontWeight:700, flexShrink:0 }}>{ch}</div>
  );
}

export default function Logs() {
  const [logs, setLogs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await api.get(`/analytics/logs?email=${search}&status=${statusFilter}`);
      if (res.data.success) setLogs(res.data.logs);
    } catch { toast.error('Failed to load logs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [search, statusFilter]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Email Delivery Logs</h1>
          <p className="page-subtitle">Real-time audit log of every email dispatched through the platform</p>
        </div>
        <button className="btn-ghost" style={{ fontSize: '0.8125rem' }}><Download size={13} /> Export CSV</button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
          <input className="input" style={{ paddingLeft: '2.375rem' }} placeholder="Filter by recipient email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="delivered">Delivered</option>
          <option value="opened">Opened</option>
          <option value="clicked">Clicked</option>
          <option value="bounced">Bounced</option>
          <option value="failed">Failed</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>
        <button className="btn-ghost"><Filter size={13} /> More filters</button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Recipient <ChevronDown size={11} style={{ display:'inline', verticalAlign:'middle', marginLeft:2 }} /></th>
              <th>Campaign / Subject</th>
              <th>Status</th>
              <th>Opens</th>
              <th>Clicks</th>
              <th>Sent At <ChevronDown size={11} style={{ display:'inline', verticalAlign:'middle', marginLeft:2 }} /></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>{[...Array(6)].map((_, j) => <td key={j}><div style={{ height: 14, background: '#f3f4f6', borderRadius: 4, width: j === 0 ? '160px' : '80px' }} /></td>)}</tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign:'center', padding:'3rem 1rem', color:'var(--text-3)' }}>
                  <FileSearch size={32} style={{ marginBottom: '0.75rem', opacity: 0.35, display: 'block', margin: '0 auto 0.75rem' }} />
                  No logs found matching the current filter.
                </td>
              </tr>
            ) : (
              logs.map(l => {
                const ev = EVENT_BADGE[l.status] || { cls: 'badge-gray', label: l.status };
                return (
                  <tr key={l._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <Avatar email={l.recipientEmail} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '0.8125rem' }}>{l.recipientEmail}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{l.recipientName || 'Subscriber'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--purple)', marginBottom: '2px' }}>{l.campaign?.name || 'Direct / Transactional'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.subject}</div>
                    </td>
                    <td><span className={`badge ${ev.cls} capitalize`}>{ev.label}</span></td>
                    <td style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)' }}>{l.opens?.length || 0}</td>
                    <td style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)' }}>{l.clicks?.length || 0}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {new Date(l.createdAt).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
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
