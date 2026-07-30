import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';
import toast from 'react-hot-toast';

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [daily, setDaily] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/overview?days=30'),
      api.get('/analytics/daily?days=30'),
      api.get('/analytics/devices'),
    ]).then(([ovRes, dailyRes, devRes]) => {
      if (ovRes.data?.success) setOverview(ovRes.data.overview);
      if (dailyRes.data?.success) setDaily(dailyRes.data.daily);
      if (devRes.data?.success) setDevices(devRes.data.devices);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load analytics data');
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading comprehensive analytics...</div>;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Deep Analytics</h1>
          <p className="page-subtitle">Historical deliverability, open tracking, and recipient device breakdowns</p>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-xs text-slate-400 mb-1">Total Delivered</div>
          <div className="text-2xl font-black text-emerald-400">{overview?.delivered?.toLocaleString() || 0}</div>
          <div className="text-xs text-emerald-500 mt-1">{overview?.deliveryRate}% Success</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-400 mb-1">Total Unique Opens</div>
          <div className="text-2xl font-black text-indigo-400">{overview?.opened?.toLocaleString() || 0}</div>
          <div className="text-xs text-indigo-400 mt-1">{overview?.openRate}% Open Rate</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-400 mb-1">Total Clicks</div>
          <div className="text-2xl font-black text-cyan-400">{overview?.clicked?.toLocaleString() || 0}</div>
          <div className="text-xs text-cyan-400 mt-1">{overview?.clickRate}% CTR</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-400 mb-1">Hard Bounces</div>
          <div className="text-2xl font-black text-rose-400">{overview?.bounced?.toLocaleString() || 0}</div>
          <div className="text-xs text-rose-400 mt-1">{overview?.bounceRate}% Bounce Rate</div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="card">
        <h2 className="text-base font-bold mb-4">30-Day Velocity & Open Trends</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily}>
              <XAxis dataKey="_id" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ background: '#141928', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="sent" stroke="#6366f1" fill="#6366f120" name="Sent" />
              <Area type="monotone" dataKey="opened" stroke="#8b5cf6" fill="#8b5cf620" name="Opened" />
              <Area type="monotone" dataKey="clicked" stroke="#06b6d4" fill="#06b6d420" name="Clicked" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
