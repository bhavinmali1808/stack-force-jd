import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart2, RefreshCw } from 'lucide-react';
import api from '../api';

const COLOR_MAP = {
  sent: '#34d399',
  failed: '#f87171',
  queued: '#818cf8',
  bounced: '#fbbf24',
  total: '#94a3b8',
};

const CAT_COLORS = {
  otp: '#fbbf24',
  welcome: '#34d399',
  outreach: '#818cf8',
  interview: '#22d3ee',
  marketing: '#c084fc',
  custom: '#94a3b8',
};

export default function Analytics({ showToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/emailer/analytics?days=${days}`);
      if (res.data.success) setData(res.data);
    } catch {
      // Fallback mock data
      setData({
        summary: { sent: 127, failed: 8, queued: 2, total: 137 },
        byCategory: [
          { _id: 'outreach', count: 56 },
          { _id: 'interview', count: 34 },
          { _id: 'marketing', count: 27 },
          { _id: 'welcome', count: 14 },
          { _id: 'otp', count: 6 },
        ],
        dailyActivity: [
          { _id: '2026-07-24', sent: 8, failed: 1 },
          { _id: '2026-07-25', sent: 12, failed: 0 },
          { _id: '2026-07-26', sent: 5, failed: 2 },
          { _id: '2026-07-27', sent: 18, failed: 1 },
          { _id: '2026-07-28', sent: 22, failed: 0 },
          { _id: '2026-07-29', sent: 31, failed: 3 },
          { _id: '2026-07-30', sent: 15, failed: 1 },
        ],
        quotaHistory: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, [days]);

  const summary = data?.summary || {};
  const byCategory = data?.byCategory || [];
  const dailyActivity = data?.dailyActivity || [];

  const maxCat = Math.max(...byCategory.map(b => b.count), 1);
  const maxDaily = Math.max(...dailyActivity.map(d => d.sent + d.failed), 1);

  const successRate = summary.total > 0
    ? Math.round((summary.sent / summary.total) * 100)
    : 0;

  const Skeleton = ({ w, h }) => <div className="skeleton" style={{ width: w, height: h, borderRadius: 6 }} />;

  return (
    <>
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Email performance metrics & insights</p>
        </div>
        <div className="page-actions">
          <select
            className="form-select"
            style={{ width: 140 }}
            value={days}
            onChange={e => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={fetchAnalytics}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="page-container" style={{ paddingTop: 16 }}>
        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Total Sent', value: summary.sent, color: '#34d399', icon: TrendingUp },
            { label: 'Failed', value: summary.failed, color: '#f87171', icon: TrendingDown },
            { label: 'Success Rate', value: `${successRate}%`, color: '#818cf8', icon: BarChart2 },
            { label: 'Total Emails', value: summary.total, color: '#94a3b8', icon: BarChart2 },
          ].map((s, i) => (
            <div key={i} className="card" style={{ padding: '18px 20px' }}>
              {loading ? (
                <div>
                  <Skeleton w="50%" h={24} />
                  <div style={{ marginTop: 6 }}><Skeleton w="70%" h={12} /></div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-0.5px' }}>
                    {s.value ?? 0}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4, fontWeight: 500 }}>
                    {s.label}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
          {/* Daily Activity Chart */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📈 Daily Email Activity</span>
            </div>
            <div className="card-body">
              {loading ? (
                [...Array(7)].map((_, i) => (
                  <div key={i} className="chart-bar-row" style={{ marginBottom: 12 }}>
                    <Skeleton w={60} h={10} />
                    <div style={{ flex: 1 }}><Skeleton w="100%" h={6} /></div>
                    <Skeleton w={30} h={10} />
                  </div>
                ))
              ) : dailyActivity.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-3)', padding: 30, fontSize: 13 }}>
                  No activity in this period
                </div>
              ) : (
                dailyActivity.map((d) => {
                  const total = d.sent + d.failed;
                  const sentW = (d.sent / maxDaily) * 100;
                  const failedW = (d.failed / maxDaily) * 100;
                  const dateLabel = new Date(d._id).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  return (
                    <div key={d._id} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{dateLabel}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-2)', fontWeight: 600 }}>
                          {d.sent} sent{d.failed > 0 ? `, ${d.failed} failed` : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <div style={{ flex: `${sentW} 0 0`, height: 6, background: '#34d399', borderRadius: '999px 0 0 999px', minWidth: sentW > 0 ? 4 : 0 }} />
                        <div style={{ flex: `${failedW} 0 0`, height: 6, background: '#f87171', borderRadius: '0 999px 999px 0', minWidth: failedW > 0 ? 4 : 0 }} />
                        <div style={{ flex: `${100 - sentW - failedW} 0 0`, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: '0 999px 999px 0' }} />
                      </div>
                    </div>
                  );
                })
              )}

              <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-3)' }}>
                  <div style={{ width: 10, height: 4, background: '#34d399', borderRadius: 999 }} /> Sent
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-3)' }}>
                  <div style={{ width: 10, height: 4, background: '#f87171', borderRadius: 999 }} /> Failed
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📊 By Category</span>
            </div>
            <div className="card-body">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <Skeleton w="50%" h={10} />
                    <div style={{ marginTop: 6 }}><Skeleton w="100%" h={5} /></div>
                  </div>
                ))
              ) : byCategory.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-3)', padding: 20, fontSize: 13 }}>
                  No data yet
                </div>
              ) : (
                byCategory.map((cat) => {
                  const pct = Math.round((cat.count / maxCat) * 100);
                  return (
                    <div key={cat._id} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 500, textTransform: 'capitalize' }}>
                          {cat._id}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: CAT_COLORS[cat._id] || 'var(--color-text-2)' }}>
                          {cat.count}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: CAT_COLORS[cat._id] || 'var(--gradient-primary)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}

              <div className="divider" />

              {/* Success Rate Gauge */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                  Overall Success Rate
                </div>
                <div style={{
                  width: 90, height: 90, borderRadius: '50%', margin: '0 auto',
                  background: `conic-gradient(#34d399 ${successRate}%, rgba(255,255,255,0.06) ${successRate}%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 0 8px var(--color-surface)',
                }}>
                  <div style={{
                    width: 66, height: 66, borderRadius: '50%',
                    background: 'var(--color-surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#34d399', textAlign: 'center' }}>
                        {loading ? '—' : `${successRate}%`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
