import React, { useState, useEffect } from 'react';
import { Cpu, Server, Activity, ShieldCheck, RefreshCw } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function SmtpHealth() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/smtp/status');
      if (res.data.success) setStatus(res.data.status);
    } catch {
      toast.error('Failed to load system health status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleTest = async () => {
    try {
      const res = await api.get('/smtp/test');
      toast.success(res.data.message || 'SMTP Verified');
      fetchStatus();
    } catch (err) {
      toast.error(err.message || 'SMTP Verification Failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">System & Infrastructure Health</h1>
          <p className="page-subtitle">Postfix, OpenDKIM, OpenDMARC, Redis, and VPS system telemetry</p>
        </div>
        <button onClick={handleTest} className="btn-primary">
          <RefreshCw size={16} /> Run SMTP Diagnostic
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Infrastructure */}
        <div className="card space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Server size={18} className="text-indigo-400" /> Infrastructure Components
          </h2>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Postfix SMTP Server</div>
                <div className="text-xs text-slate-400">mail.resuming.io:587 (TLS Enabled)</div>
              </div>
              <span className={`badge ${status?.smtp?.ok ? 'badge-green' : 'badge-red'}`}>
                {status?.smtp?.ok ? 'Connected' : 'Error'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Redis Queue Engine</div>
                <div className="text-xs text-slate-400">127.0.0.1:6379 (BullMQ)</div>
              </div>
              <span className={`badge ${status?.redis?.ok ? 'badge-green' : 'badge-red'}`}>
                {status?.redis?.ok ? 'Connected' : 'Error'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Deliverability Suite</div>
                <div className="text-xs text-slate-400">OpenDKIM + OpenDMARC + SPF</div>
              </div>
              <span className="badge badge-green">Active</span>
            </div>
          </div>
        </div>

        {/* Telemetry */}
        <div className="card space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Cpu size={18} className="text-indigo-400" /> Host System Telemetry
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-xs text-slate-400 mb-1">CPU Load Average</div>
              <div className="text-2xl font-black text-indigo-400">{status?.system?.cpu || '0.00'}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-xs text-slate-400 mb-1">Memory Utilization</div>
              <div className="text-2xl font-black text-purple-400">{status?.system?.memUsed || 0}%</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-xs text-slate-400 mb-1">Process Uptime</div>
              <div className="text-xl font-bold text-emerald-400">{Math.floor((status?.system?.uptime || 0) / 3600)}h {Math.floor(((status?.system?.uptime || 0) % 3600) / 60)}m</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-xs text-slate-400 mb-1">Node Environment</div>
              <div className="text-xl font-bold text-cyan-400">{status?.system?.nodeVersion || 'v18'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
