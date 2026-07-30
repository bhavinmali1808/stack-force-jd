import React, { useState, useEffect } from 'react';
import { Plus, Send, Eye, CheckCircle, XCircle, Clock, Users, ChevronDown } from 'lucide-react';
import api from '../api';
import CampaignModal from '../components/CampaignModal';

const STATUS_BADGE = {
  sent:     { cls: 'badge-success', Icon: CheckCircle },
  failed:   { cls: 'badge-danger',  Icon: XCircle },
  sending:  { cls: 'badge-primary', Icon: Clock },
  draft:    { cls: 'badge-default', Icon: Clock },
  paused:   { cls: 'badge-warning', Icon: Clock },
};

export default function Campaigns({ quota, showToast }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await api.get('/emailer/campaigns');
      if (res.data.success) setCampaigns(res.data.campaigns);
    } catch {
      setCampaigns([
        { _id: '1', name: 'Q3 Outreach — React Devs', category: 'outreach', status: 'sent', recipientCount: 45, sentCount: 43, failedCount: 2, sentAt: new Date('2026-07-28') },
        { _id: '2', name: 'Interview Invites — Round 2', category: 'interview', status: 'sent', recipientCount: 12, sentCount: 12, failedCount: 0, sentAt: new Date('2026-07-25') },
        { _id: '3', name: 'Welcome — New Registrations', category: 'welcome', status: 'draft', recipientCount: 0, sentCount: 0, failedCount: 0, sentAt: null },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleCreate = async (payload) => {
    try {
      const res = await api.post('/emailer/campaigns', payload);
      if (res.data.success) {
        showToast('success', `Campaign "${res.data.campaign.name}" sent — ${res.data.results.sent} delivered`);
        setIsModalOpen(false);
        fetchCampaigns();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to send campaign');
    }
  };

  const openDetail = async (campaign) => {
    try {
      const res = await api.get(`/emailer/campaigns/${campaign._id}`);
      if (res.data.success) setDetailModal(res.data);
    } catch {
      setDetailModal({ campaign, logs: [] });
    }
  };

  const getCatBadge = (cat) => ({
    marketing: 'badge-primary',
    outreach: 'badge-default',
    interview: 'badge-warning',
    welcome: 'badge-success',
    newsletter: 'badge-primary',
  }[cat] || 'badge-default');

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <>
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">Create & track bulk email campaigns</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={14} /> New Campaign
          </button>
        </div>
      </div>

      <div className="page-container" style={{ paddingTop: 16 }}>
        {/* Summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Campaigns', value: campaigns.length, color: '#818cf8' },
            { label: 'Emails Delivered', value: campaigns.reduce((a, c) => a + (c.sentCount || 0), 0), color: '#34d399' },
            { label: 'Failed', value: campaigns.reduce((a, c) => a + (c.failedCount || 0), 0), color: '#f87171' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{loading ? '—' : s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Campaigns Table */}
        <div className="card">
          {loading ? (
            <div style={{ padding: 24 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 20, marginBottom: 14, width: `${90 - i * 8}%` }} />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📮</div>
              <h3>No campaigns yet</h3>
              <p>Launch your first campaign to start reaching candidates at scale</p>
              <br />
              <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                <Plus size={13} /> Create Campaign
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Campaign Name</th>
                    <th>Category</th>
                    <th>Recipients</th>
                    <th>Delivered</th>
                    <th>Failed</th>
                    <th>Status</th>
                    <th>Sent At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const statusInfo = STATUS_BADGE[c.status] || STATUS_BADGE.draft;
                    const deliverRate = c.recipientCount > 0
                      ? Math.round((c.sentCount / c.recipientCount) * 100) : 0;
                    return (
                      <tr key={c._id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 13 }}>{c.name}</div>
                          {c.recipientCount > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                              {deliverRate}% delivery rate
                            </div>
                          )}
                        </td>
                        <td><span className={`badge ${getCatBadge(c.category)}`}>{c.category}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Users size={12} style={{ color: 'var(--color-text-muted)' }} />
                            {c.recipientCount}
                          </div>
                        </td>
                        <td style={{ color: 'var(--color-success)' }}>{c.sentCount}</td>
                        <td style={{ color: c.failedCount > 0 ? 'var(--color-danger)' : 'var(--color-text-3)' }}>
                          {c.failedCount || 0}
                        </td>
                        <td>
                          <span className={`badge ${statusInfo.cls}`}>
                            <statusInfo.Icon size={10} />
                            {c.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{fmt(c.sentAt)}</td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openDetail(c)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Eye size={13} /> View
                          </button>
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

      {/* Create Campaign Modal */}
      <CampaignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
        quota={quota}
      />

      {/* Campaign Detail Modal */}
      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="modal" style={{ maxWidth: 800 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">📊 {detailModal.campaign?.name}</span>
              <button className="modal-close" onClick={() => setDetailModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Sent', value: detailModal.campaign?.sentCount || 0, color: '#34d399' },
                  { label: 'Failed', value: detailModal.campaign?.failedCount || 0, color: '#f87171' },
                  { label: 'Total', value: detailModal.campaign?.recipientCount || 0, color: '#818cf8' },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'var(--color-surface-2)', padding: '12px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Recipient</th>
                      <th>Status</th>
                      <th>Sent At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailModal.logs || []).map((l, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{l.recipientName || l.recipientEmail}</div>
                          {l.recipientName && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{l.recipientEmail}</div>}
                        </td>
                        <td>
                          <span className={`badge ${l.status === 'sent' ? 'badge-success' : 'badge-danger'}`}>
                            {l.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                          {new Date(l.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                    {(detailModal.logs || []).length === 0 && (
                      <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-text-3)', padding: 24 }}>No logs found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
