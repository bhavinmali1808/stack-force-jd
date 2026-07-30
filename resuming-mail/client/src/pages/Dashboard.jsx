import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Send, CheckCircle, Eye, MousePointer, AlertTriangle, Layers, Activity, Cpu } from 'lucide-react';
import api from '../api';

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [daily, setDaily] = useState([]);
  const [queue, setQueue] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/overview').catch(() => ({ data: {} })),
      api.get('/analytics/daily?days=14').catch(() => ({ data: {} })),
      api.get('/queue/status').catch(() => ({ data: {} })),
      api.get('/smtp/status').catch(() => ({ data: {} })),
    ]).then(([ovRes, dailyRes, qRes, hRes]) => {
      if (ovRes.data?.success) setOverview(ovRes.data.overview);
      if (dailyRes.data?.success) setDaily(dailyRes.data.daily);
      if (qRes.data?.success) setQueue(qRes.data.queue);
      if (hRes.data?.success) setHealth(hRes.data.status);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center" style={{ color: 'var(--text-3)' }}>Loading dashboard metrics...</div>;
  }

  const stats = [
    { label: 'Emails Sent Today', val: overview?.sentToday || 0, icon: Send, color: '#6366f1' },
    { label: 'Delivery Rate', val: `${overview?.deliveryRate || 0}%`, icon: CheckCircle, color: '#10b981' },
    { label: 'Open Rate', val: `${overview?.openRate || 0}%`, icon: Eye, color: '#8b5cf6' },
    { label: 'Click Rate', val: `${overview?.clickRate || 0}%`, icon: MousePointer, color: '#06b6d4' },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">Real-time engagement and queue metrics for mail.resuming.io</p>
        </div>
      </div>

      {/* Top 4 Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>{s.label}</span>
                <div className="p-2 rounded-lg" style={{ background: `${s.color}15`, color: s.color }}>
                  <Icon size={16} />
                </div>
              </div>
              <div className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>{s.val}</div>
            </div>
          );
        })}
      </div>

      {/* Main Charts + System Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Chart (2 Cols) */}
        <div className="lg:col-span-2 card">
          <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text-1)' }}>Volume & Engagement (14 Days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="_id" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ background: '#141928', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="sent" stroke="#6366f1" fillOpacity={1} fill="url(#colorSent)" name="Sent" />
                <Area type="monotone" dataKey="opened" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorOpen)" name="Opened" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System & Queue Status Card */}
        <div className="card space-y-4">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Engine & Queue Status</h2>
          
          <div className="p-3 rounded-lg flex items-center justify-between" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <Activity size={18} className="text-indigo-400" />
              <div>
                <div className="text-xs font-semibold">SMTP Engine (Postfix)</div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>mail.resuming.io:587</div>
              </div>
            </div>
            <span className={`badge ${health?.smtp?.ok ? 'badge-green' : 'badge-red'}`}>
              {health?.smtp?.ok ? 'Operational' : 'Offline'}
            </span>
          </div>

          <div className="p-3 rounded-lg flex items-center justify-between" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <Layers size={18} className="text-amber-400" />
              <div>
                <div className="text-xs font-semibold">BullMQ Queue</div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>{queue?.waiting || 0} waiting · {queue?.active || 0} active</div>
              </div>
            </div>
            <span className="badge badge-amber">{queue?.total || 0} Total</span>
          </div>

          <div className="p-3 rounded-lg flex items-center justify-between" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <Cpu size={18} className="text-cyan-400" />
              <div>
                <div className="text-xs font-semibold">VPS Metrics</div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>CPU Load: {health?.system?.cpu || '0.00'}</div>
              </div>
            </div>
            <span className="badge badge-blue">RAM: {health?.system?.memUsed || 0}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
