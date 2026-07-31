import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Send, Eye, MousePointer, AlertTriangle, Calendar, Download } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [daily, setDaily]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [range, setRange]       = useState('30');

  useEffect(() => {
    Promise.all([
      api.get(`/analytics/overview?days=${range}`),
      api.get(`/analytics/daily?days=${range}`),
    ]).then(([ovRes, dailyRes]) => {
      if (ovRes.data?.success)    setOverview(ovRes.data.overview);
      if (dailyRes.data?.success) setDaily(dailyRes.data.daily);
      setLoading(false);
    }).catch(() => { toast.error('Failed to load analytics'); setLoading(false); });
  }, [range]);

  const kpis = [
    { label: 'Total Delivered', value: overview?.delivered?.toLocaleString() || 0, sub: `${overview?.deliveryRate || 0}% delivery rate`, color: '#059669', bg: '#ecfdf5', icon: Send },
    { label: 'Unique Opens',    value: overview?.opened?.toLocaleString()    || 0, sub: `${overview?.openRate || 0}% open rate`,    color: '#7c3aed', bg: '#f5f3ff', icon: Eye },
    { label: 'Link Clicks',     value: overview?.clicked?.toLocaleString()   || 0, sub: `${overview?.clickRate || 0}% CTR`,         color: '#2563eb', bg: '#eff6ff', icon: MousePointer },
    { label: 'Hard Bounces',    value: overview?.bounced?.toLocaleString()   || 0, sub: `${overview?.bounceRate || 0}% bounce rate`, color: '#dc2626', bg: '#fef2f2', icon: AlertTriangle },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Deliverability metrics, open tracking, and campaign performance</p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <select className="select" style={{ width: 140 }} value={range} onChange={e => setRange(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button className="btn-ghost"><Download size={13} /> Export</button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.875rem', marginBottom: '1.25rem' }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            background: '#fff', border: '1px solid var(--border)', borderRadius: '12px',
            padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem' }}>
              <k.icon size={18} style={{ color: k.color }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.2rem' }}>
              {loading ? '—' : k.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{k.label}</div>
            <div style={{ fontSize: '0.6875rem', color: k.color, fontWeight: 600, marginTop: '0.25rem' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>

        {/* Main trend chart */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} style={{ color: 'var(--purple)' }} /> {range}-Day Email Performance
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily.length ? daily : [{ _id: '-', sent: 0 }]}>
                <defs>
                  {[['gS','#7c3aed'],['gO','#059669'],['gC','#2563eb']].map(([id,c]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={c} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={c} stopOpacity={0}    />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="_id" stroke="#e5e7eb" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#e5e7eb" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', borderColor: '#e5e7eb', borderRadius: '8px', fontSize: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.75rem' }} />
                <Area type="monotone" dataKey="sent"    stroke="#7c3aed" strokeWidth={2} fillOpacity={1} fill="url(#gS)" name="Sent"    dot={false} />
                <Area type="monotone" dataKey="opened"  stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#gO)" name="Opened"  dot={false} />
                <Area type="monotone" dataKey="clicked" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#gC)" name="Clicked" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary panel */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', marginBottom: '1rem' }}>Performance Summary</div>
          {[
            { label: 'Delivery Rate', value: `${overview?.deliveryRate || 0}%`, color: '#059669', pct: overview?.deliveryRate || 0 },
            { label: 'Open Rate',     value: `${overview?.openRate    || 0}%`, color: '#7c3aed', pct: overview?.openRate    || 0 },
            { label: 'Click Rate',    value: `${overview?.clickRate   || 0}%`, color: '#2563eb', pct: overview?.clickRate   || 0 },
            { label: 'Bounce Rate',   value: `${overview?.bounceRate  || 0}%`, color: '#dc2626', pct: overview?.bounceRate  || 0 },
          ].map(r => (
            <div key={r.label} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500 }}>{r.label}</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: r.color }}>{r.value}</span>
              </div>
              <div style={{ height: 6, background: '#f3f4f6', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(r.pct, 100)}%`, background: r.color, borderRadius: 9999, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
