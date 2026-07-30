import React, { useState, useEffect } from 'react';
import { Send, Users, Mail, TrendingUp, ArrowRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import store from '../store/emailerStore';

export default function Dashboard({ quota, onNavigate }) {
  const [analytics, setAnalytics] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      store.analytics.get(30),
      store.campaigns.list(),
    ]).then(([analyticsData, campaignList]) => {
      if (analyticsData) setAnalytics(analyticsData);
      setCampaigns((campaignList || []).slice(0, 5));
      setLoading(false);
    });
  }, []);

  const stats = analytics?.summary || { sent: 0, failed: 0, total: 0 };
  const openRate = stats.total > 0 ? Math.round(((analytics?.summary?.opened || 0) / stats.total) * 100) : 0;

  const statCards = [
    {
      label: 'Emails Sent',
      value: stats.sent,
      icon: Send,
      color: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      bg: 'rgba(99,102,241,0.15)',
      text: '#818cf8',
    },
    {
      label: 'Contacts',
      value: '—',
      icon: Users,
      color: 'linear-gradient(135deg,#06b6d4,#0891b2)',
      bg: 'rgba(6,182,212,0.15)',
      text: '#22d3ee',
    },
    {
      label: 'Open Rate',
      value: `${openRate}%`,
      icon: TrendingUp,
      color: 'linear-gradient(135deg,#10b981,#059669)',
      bg: 'rgba(16,185,129,0.15)',
      text: '#34d399',
    },
    {
      label: 'Today Remaining',
      value: quota?.remaining ?? '—',
      icon: Mail,
      color: quota?.remaining <= 2 ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#f59e0b,#d97706)',
      bg: quota?.remaining <= 2 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
      text: quota?.remaining <= 2 ? '#f87171' : '#fbbf24',
    },
  ];

  const getCategoryColor = (cat) => ({
    marketing: 'badge-primary',
    outreach: 'badge-default',
    interview: 'badge-warning',
    welcome: 'badge-success',
  }[cat] || 'badge-default');

  const getStatusBadge = (status) => {
    const map = {
      sent: { cls: 'badge-success', icon: CheckCircle },
      failed: { cls: 'badge-danger', icon: XCircle },
      sending: { cls: 'badge-primary', icon: Clock },
      draft: { cls: 'badge-default', icon: Clock },
    };
    return map[status] || map.draft;
  };

  const byCategory = analytics?.byCategory || [];
  const maxCat = Math.max(...byCategory.map(b => b.count), 1);

  return (
    <>
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your email marketing overview — last 30 days</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => onNavigate('campaigns')}>
            <Send size={14} /> New Campaign
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        {statCards.map((s, i) => (
          <div
            key={i}
            className="stat-card"
            style={{ '--card-color': s.color, '--card-bg': s.bg, '--card-text': s.text }}
          >
            <div className="stat-icon">
              <s.icon size={18} />
            </div>
            <div className="stat-body">
              <div className="stat-value">{loading ? '—' : s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, padding: '0 28px 28px' }}>
        {/* Recent Campaigns */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Campaigns</span>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('campaigns')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={13} />
            </button>
          </div>
          {loading ? (
            <div style={{ padding: 20 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 18, marginBottom: 12, borderRadius: 6, width: `${80 - i * 10}%` }} />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <h3>No campaigns yet</h3>
              <p>Create your first campaign to start reaching candidates</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Category</th>
                    <th>Sent</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const statusInfo = getStatusBadge(c.status);
                    return (
                      <tr key={c._id}>
                        <td style={{ color: 'var(--color-text)', fontWeight: 500 }}>{c.name}</td>
                        <td><span className={`badge ${getCategoryColor(c.category)}`}>{c.category}</span></td>
                        <td>{c.sentCount}/{c.recipientCount}</td>
                        <td>
                          <span className={`badge ${statusInfo.cls}`}>
                            <statusInfo.icon size={10} />
                            {c.status}
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

        {/* Activity by Category */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">By Category</span>
          </div>
          <div className="card-body">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div className="skeleton" style={{ height: 10, width: '60%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 5 }} />
                </div>
              ))
            ) : byCategory.length === 0 ? (
              <div style={{ color: 'var(--color-text-3)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                No data yet
              </div>
            ) : (
              byCategory.map((cat) => (
                <div key={cat._id} className="chart-bar-row">
                  <div className="chart-bar-label">{cat._id}</div>
                  <div className="chart-bar-track">
                    <div className="chart-bar-fill" style={{ width: `${(cat.count / maxCat) * 100}%` }} />
                  </div>
                  <div className="chart-bar-count">{cat.count}</div>
                </div>
              ))
            )}

            <div className="divider" />

            {/* Daily quota info */}
            {quota && (
              <div style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8 }}>
                  <span>Today's quota</span>
                  <span style={{ color: 'var(--color-text-2)', fontWeight: 600 }}>
                    {quota.sentCount} / {quota.dailyLimit === 'Unlimited' ? '∞' : quota.dailyLimit}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: quota.dailyLimit === 'Unlimited' ? '10%' :
                        `${Math.min(100, (quota.sentCount / quota.dailyLimit) * 100)}%`,
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
                  {quota.remaining} emails remaining today
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
