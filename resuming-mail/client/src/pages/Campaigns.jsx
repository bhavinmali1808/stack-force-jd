import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Send, Play, Pause, Copy, Trash2,
  Filter, Search, ChevronDown, MoreHorizontal,
  Mail, Calendar, TrendingUp, Users
} from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  sent:    { label: 'Sent',    className: 'badge-green' },
  sending: { label: 'Sending', className: 'badge-blue'  },
  paused:  { label: 'Paused',  className: 'badge-amber' },
  draft:   { label: 'Draft',   className: 'badge-gray'  },
};

const CAMPAIGN_ICONS = ['📧', '📨', '📬', '💌', '📣', '🎯'];
const CAMPAIGN_COLORS = ['#fef3c7','#ede9fe','#dbeafe','#dcfce7','#fee2e2','#fce7f3'];

function CampaignThumb({ name, index }) {
  const emoji = CAMPAIGN_ICONS[index % CAMPAIGN_ICONS.length];
  const bg    = CAMPAIGN_COLORS[index % CAMPAIGN_COLORS.length];
  return (
    <div className="campaign-thumb" style={{ background: bg }}>
      {emoji}
    </div>
  );
}

export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCampaigns = async () => {
    try {
      const res = await api.get('/campaigns');
      if (res.data.success) setCampaigns(res.data.campaigns);
    } catch {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleSend = async (id) => {
    if (!window.confirm('Queue this campaign for immediate delivery?')) return;
    try {
      const res = await api.post(`/campaigns/${id}/send`);
      toast.success(res.data.message);
      fetchCampaigns();
    } catch (err) { toast.error(err.message || 'Failed to queue campaign'); }
  };

  const handlePause    = async (id) => { try { await api.post(`/campaigns/${id}/pause`);     toast.success('Paused');      fetchCampaigns(); } catch { toast.error('Failed'); } };
  const handleResume   = async (id) => { try { await api.post(`/campaigns/${id}/resume`);    toast.success('Resumed');     fetchCampaigns(); } catch { toast.error('Failed'); } };
  const handleDuplicate= async (id) => { try { await api.post(`/campaigns/${id}/duplicate`); toast.success('Duplicated'); fetchCampaigns(); } catch { toast.error('Failed'); } };
  const handleDelete   = async (id) => {
    if (!window.confirm('Delete campaign?')) return;
    try { await api.delete(`/campaigns/${id}`); toast.success('Deleted'); fetchCampaigns(); }
    catch { toast.error('Failed to delete'); }
  };

  const tabs = [
    { key: 'all',    label: 'All campaigns' },
    { key: 'sent',   label: 'Sent' },
    { key: 'draft',  label: 'Drafts' },
    { key: 'outbox', label: 'Outbox (Sending & Queued)' },
  ];

  const filtered = campaigns.filter(c => {
    let matchTab = false;
    if (activeTab === 'all') matchTab = true;
    else if (activeTab === 'outbox') matchTab = ['sending', 'queued', 'paused'].includes(c.status);
    else matchTab = c.status === activeTab;

    const matchSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '0.25rem' }}>
        <h1 className="page-title">Campaign</h1>
        <p className="page-subtitle" style={{ marginTop: '0.25rem' }}>
          Grow your business further. Powerful content for business growth, engagement, and lasting success.
        </p>
      </div>

      {/* Tab row + search + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '1.25rem 0 0', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`tab-item${activeTab === t.key ? ' active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', paddingBottom: '0.5rem' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input
              className="input"
              style={{ width: '200px', paddingLeft: '2rem', fontSize: '0.8125rem' }}
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter button */}
          <button className="btn-ghost" style={{ fontSize: '0.8125rem' }}>
            <Filter size={14} /> Filter
          </button>

          {/* Create */}
          <Link to="/campaigns/new" className="btn-primary">
            <Plus size={14} /> Create campaign
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, marginTop: '1rem', overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '35%' }}>
                Campaigns <ChevronDown size={12} style={{ display: 'inline', marginLeft: 2, verticalAlign: 'middle' }} />
              </th>
              <th>Type <ChevronDown size={12} style={{ display: 'inline', marginLeft: 2, verticalAlign: 'middle' }} /></th>
              <th>Status <ChevronDown size={12} style={{ display: 'inline', marginLeft: 2, verticalAlign: 'middle' }} /></th>
              <th>Last updated <ChevronDown size={12} style={{ display: 'inline', marginLeft: 2, verticalAlign: 'middle' }} /></th>
              <th>Open rate <ChevronDown size={12} style={{ display: 'inline', marginLeft: 2, verticalAlign: 'middle' }} /></th>
              <th>Subscribed <ChevronDown size={12} style={{ display: 'inline', marginLeft: 2, verticalAlign: 'middle' }} /></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j}><div style={{ height: 16, background: '#f3f4f6', borderRadius: 4, width: j === 0 ? '140px' : '60px' }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
                  <Mail size={32} style={{ marginBottom: '0.75rem', opacity: 0.4, display: 'block', margin: '0 auto 0.75rem' }} />
                  No campaigns found. <Link to="/campaigns/new" style={{ color: 'var(--purple)', fontWeight: 600 }}>Create your first campaign</Link>
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => {
                const openPct = c.stats?.delivered ? ((c.stats.opened / c.stats.delivered) * 100).toFixed(1) : '0.0';
                const subPct  = c.stats?.total     ? ((c.stats.delivered / c.stats.total) * 100).toFixed(1) : '0.0';
                const status  = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
                return (
                  <tr key={c._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <CampaignThumb name={c.name} index={i} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '0.8125rem', marginBottom: '2px' }}>{c.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{c.subject || 'No subject'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-3)', fontSize: '0.75rem' }}>
                        <Mail size={13} /> Email
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${status.className}`}>{status.label}</span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                      {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g,'-') : '—'}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-1)' }}>{openPct}%</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>({c.stats?.opened || 0})</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-1)' }}>{subPct}%</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>({c.stats?.delivered || 0})</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {c.status === 'draft'   && <button onClick={() => handleSend(c._id)}      title="Send"      style={{ padding: '0.25rem 0.5rem', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--purple)', fontSize: '0.75rem', fontWeight: 600 }}>Send</button>}
                        {c.status === 'sending' && <button onClick={() => handlePause(c._id)}     title="Pause"     style={{ padding: '0.25rem 0.5rem', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--amber)', fontSize: '0.75rem', fontWeight: 600 }}>Pause</button>}
                        {c.status === 'paused'  && <button onClick={() => handleResume(c._id)}    title="Resume"    style={{ padding: '0.25rem 0.5rem', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--green)', fontSize: '0.75rem', fontWeight: 600 }}>Resume</button>}
                        <button onClick={() => handleDuplicate(c._id)} title="Duplicate" style={{ padding: '0.25rem', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)' }}><Copy size={14} /></button>
                        <button onClick={() => handleDelete(c._id)}    title="Delete"    style={{ padding: '0.25rem', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)' }}><MoreHorizontal size={14} /></button>
                      </div>
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
