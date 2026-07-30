import React, { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Queue() {
  const [status, setStatus] = useState(null);
  const [failedJobs, setFailedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const [sRes, fRes] = await Promise.all([
        api.get('/queue/status'),
        api.get('/queue/failed'),
      ]);
      if (sRes.data?.success) setStatus(sRes.data.queue);
      if (fRes.data?.success) setFailedJobs(fRes.data.jobs);
    } catch {
      toast.error('Failed to load queue status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(); }, []);

  const handlePause = async () => {
    try {
      await api.post('/queue/pause');
      toast.success('Queue paused');
      fetchQueue();
    } catch { toast.error('Failed to pause queue'); }
  };

  const handleResume = async () => {
    try {
      await api.post('/queue/resume');
      toast.success('Queue resumed');
      fetchQueue();
    } catch { toast.error('Failed to resume queue'); }
  };

  const handleRetryAll = async () => {
    try {
      const res = await api.post('/retry-all');
      toast.success(res.data.message);
      fetchQueue();
    } catch { toast.error('Failed to retry jobs'); }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">BullMQ Queue Manager</h1>
          <p className="page-subtitle">Inspect worker throughput, pause queue execution, and retry failed delivery jobs</p>
        </div>
        <div className="flex items-center gap-3">
          {status?.isPaused ? (
            <button onClick={handleResume} className="btn-primary">
              <Play size={16} /> Resume Queue Worker
            </button>
          ) : (
            <button onClick={handlePause} className="btn-ghost text-amber-400 border-amber-500/30">
              <Pause size={16} /> Pause Queue Worker
            </button>
          )}
        </div>
      </div>

      {/* Queue Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-xs text-slate-400 mb-1">Waiting in Queue</div>
          <div className="text-2xl font-black text-amber-400">{status?.waiting?.toLocaleString() || 0}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-400 mb-1">Active Sending</div>
          <div className="text-2xl font-black text-indigo-400">{status?.active?.toLocaleString() || 0}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-400 mb-1">Completed Jobs</div>
          <div className="text-2xl font-black text-emerald-400">{status?.completed?.toLocaleString() || 0}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-400 mb-1">Failed Jobs</div>
          <div className="text-2xl font-black text-rose-400">{status?.failed?.toLocaleString() || 0}</div>
        </div>
      </div>

      {/* Failed Jobs Section */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Failed Jobs ({failedJobs.length})</h2>
          {failedJobs.length > 0 && (
            <button onClick={handleRetryAll} className="btn-ghost text-xs">
              <RefreshCw size={14} /> Retry All Failed Jobs
            </button>
          )}
        </div>

        {failedJobs.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            No failed jobs in Redis queue. All systems operating cleanly.
          </div>
        ) : (
          <div className="space-y-2">
            {failedJobs.map(j => (
              <div key={j.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-200">{j.data?.recipientEmail}</span>
                  <span className="text-slate-400 ml-2">({j.data?.subject})</span>
                  <div className="text-rose-400 mt-0.5">{j.failedReason || 'SMTP socket timeout'}</div>
                </div>
                <span className="badge badge-red">Attempt {j.attemptsMade}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
