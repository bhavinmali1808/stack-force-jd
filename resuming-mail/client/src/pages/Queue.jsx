import React, { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw, AlertCircle, CheckCircle2, Clock, Activity, XCircle, Layers } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Queue() {
  const [status, setStatus]       = useState(null);
  const [failedJobs, setFailedJobs] = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetchQueue = async () => {
    try {
      const [sRes, fRes] = await Promise.all([
        api.get('/queue/status'),
        api.get('/queue/failed'),
      ]);
      if (sRes.data?.success) setStatus(sRes.data.queue);
      if (fRes.data?.success) setFailedJobs(fRes.data.jobs);
    } catch { toast.error('Failed to load queue status'); }
    finally   { setLoading(false); }
  };

  useEffect(() => { fetchQueue(); }, []);

  const handlePause    = async () => { try { await api.post('/queue/pause');  toast.success('Queue paused');  fetchQueue(); } catch { toast.error('Failed'); } };
  const handleResume   = async () => { try { await api.post('/queue/resume'); toast.success('Queue resumed'); fetchQueue(); } catch { toast.error('Failed'); } };
  const handleRetryAll = async () => {
    try { const res = await api.post('/retry-all'); toast.success(res.data.message); fetchQueue(); }
    catch { toast.error('Failed to retry jobs'); }
  };

  const statCards = [
    { label: 'Waiting in Queue', value: status?.waiting,   color: '#d97706', bg: '#fffbeb', icon: Clock },
    { label: 'Active Sending',   value: status?.active,    color: '#7c3aed', bg: '#f5f3ff', icon: Activity },
    { label: 'Completed Jobs',   value: status?.completed, color: '#059669', bg: '#ecfdf5', icon: CheckCircle2 },
    { label: 'Failed Jobs',      value: status?.failed,    color: '#dc2626', bg: '#fef2f2', icon: XCircle },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">BullMQ Queue Manager</h1>
          <p className="page-subtitle">Inspect worker throughput, pause queue execution, and retry failed delivery jobs</p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button onClick={fetchQueue} className="btn-ghost"><RefreshCw size={13} /> Refresh</button>
          {status?.isPaused ? (
            <button onClick={handleResume} className="btn-primary"><Play size={14} /> Resume Queue</button>
          ) : (
            <button onClick={handlePause}  className="btn-ghost" style={{ color: 'var(--amber)' }}><Pause size={14} /> Pause Queue</button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem', marginBottom: '1.25rem' }}>
        {statCards.map(s => (
          <div key={s.label} style={{
            background: '#fff', border: '1px solid var(--border)', borderRadius: '12px',
            padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem' }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div style={{ fontSize: '1.625rem', fontWeight: 700, color: s.color, marginBottom: '0.2rem' }}>
              {loading ? '—' : (s.value ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status indicator */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: status?.isPaused ? '#d97706' : '#059669', boxShadow: `0 0 0 3px ${status?.isPaused ? '#fef3c7' : '#d1fae5'}` }} />
        <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: status?.isPaused ? 'var(--amber)' : 'var(--green)' }}>
          {status?.isPaused ? 'Queue is currently PAUSED' : 'Queue is running normally'}
        </span>
        {status?.isPaused && (
          <button onClick={handleResume} className="btn-primary" style={{ marginLeft: 'auto', fontSize: '0.8125rem' }}>
            <Play size={13} /> Resume Now
          </button>
        )}
      </div>

      {/* Failed Jobs */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={15} style={{ color: 'var(--purple)' }} /> Failed Jobs
            {failedJobs.length > 0 && (
              <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '0.6875rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                {failedJobs.length}
              </span>
            )}
          </div>
          {failedJobs.length > 0 && (
            <button onClick={handleRetryAll} className="btn-ghost" style={{ fontSize: '0.8125rem' }}>
              <RefreshCw size={13} /> Retry All
            </button>
          )}
        </div>

        {failedJobs.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-3)' }}>
            <CheckCircle2 size={32} style={{ marginBottom: '0.75rem', opacity: 0.4, display: 'block', margin: '0 auto 0.75rem', color: 'var(--green)' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.25rem' }}>No failed jobs</div>
            <div style={{ fontSize: '0.8125rem' }}>Redis queue is operating cleanly. All deliveries succeeded.</div>
          </div>
        ) : (
          <div style={{ padding: '0.75rem' }}>
            {failedJobs.map(j => (
              <div key={j.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.875rem 1rem', borderRadius: '10px', background: '#fef2f2',
                border: '1px solid #fecaca', marginBottom: '0.5rem',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-1)', marginBottom: '0.25rem' }}>{j.data?.recipientEmail}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{j.data?.subject}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--red)', fontWeight: 500, marginTop: '0.25rem' }}>{j.failedReason || 'SMTP socket timeout'}</div>
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
