import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Send, CheckCircle, Eye, MousePointer, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [daily, setDaily]       = useState([]);
  const [queue, setQueue]       = useState(null);
  const [health, setHealth]     = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/overview').catch(() => ({ data: {} })),
      api.get('/analytics/daily?days=14').catch(() => ({ data: {} })),
      api.get('/queue/status').catch(() => ({ data: {} })),
      api.get('/smtp/status').catch(() => ({ data: {} })),
    ]).then(([ovRes, dailyRes, qRes, hRes]) => {
      if (ovRes.data?.success)    setOverview(ovRes.data.overview);
      if (dailyRes.data?.success) setDaily(dailyRes.data.daily);
      if (qRes.data?.success)     setQueue(qRes.data.queue);
      if (hRes.data?.success)     setHealth(hRes.data.status);
      setLoading(false);
    });
  }, []);

  const stats = [
    { label: 'Emails Sent Today', value: overview?.sentToday || 0,       color: '#7c3aed', bg: '#f5f3ff', icon: Send,         trend: '+12%' },
    { label: 'Delivered',         value: overview?.totalDelivered || 0,   color: '#059669', bg: '#ecfdf5', icon: CheckCircle,  trend: '+8.4%' },
    { label: 'Open Rate',         value: `${overview?.openRate || 0}%`,   color: '#2563eb', bg: '#eff6ff', icon: Eye,          trend: '+2.1%' },
    { label: 'Click Rate',        value: `${overview?.clickRate || 0}%`,  color: '#d97706', bg: '#fffbeb', icon: MousePointer, trend: '-0.3%' },
  ];

  return (
    <div>
      {/* Page title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Overview</h1>
        <p className="page-subtitle">Your email platform at a glance — campaigns, delivery, and system health.</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem', marginBottom: '1.25rem' }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: '#fff', border: '1px solid var(--border)', borderRadius: '12px',
            padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            transition: 'box-shadow 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '8px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <span style={{
                fontSize: '0.6875rem', fontWeight: 600,
                color: s.trend.startsWith('+') ? 'var(--green)' : 'var(--red)',
                background: s.trend.startsWith('+') ? 'var(--green-bg)' : 'var(--red-bg)',
                padding: '0.15rem 0.5rem', borderRadius: '6px',
              }}>{s.trend}</span>
            </div>
            <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.2rem' }}>
              {loading ? '—' : s.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Chart - full width */}
      <div style={{
        background: '#fff', border: '1px solid var(--border)', borderRadius: '12px',
        padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)' }}>Email Volume — Last 14 days</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Daily send throughput</div>
          </div>
          <Link to="/analytics" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--purple)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            Full Analytics <ArrowRight size={13} />
          </Link>
        </div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily.length ? daily : [{ _id: '-', sent: 0 }]}>
              <defs>
                <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="_id" stroke="#e5e7eb" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#e5e7eb" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#fff', borderColor: '#e5e7eb', borderRadius: '8px', fontSize: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="sent" stroke="#7c3aed" strokeWidth={2} fillOpacity={1} fill="url(#gSent)" name="Sent" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Queue card - small summary */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-1)', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={15} style={{ color: 'var(--purple)' }} /> Email Queue
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem' }}>
          {[
            { label: 'Waiting',   value: queue?.waiting   || 0, color: 'var(--amber)' },
            { label: 'Active',    value: queue?.active    || 0, color: 'var(--purple)' },
            { label: 'Completed', value: queue?.completed || 0, color: 'var(--green)' },
            { label: 'Failed',    value: queue?.failed    || 0, color: 'var(--red)' },
          ].map(r => (
            <div key={r.label} style={{ textAlign: 'center', padding: '0.75rem', background: '#fafafa', borderRadius: '10px', border: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: r.color, marginBottom: '0.25rem' }}>{loading ? '—' : r.value.toLocaleString()}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500 }}>{r.label}</div>
            </div>
          ))}
        </div>
        <Link to="/queue" style={{ display: 'block', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--purple)', marginTop: '0.875rem', textDecoration: 'none' }}>
          Manage Queue →
        </Link>
      </div>
    </div>
  );
}
