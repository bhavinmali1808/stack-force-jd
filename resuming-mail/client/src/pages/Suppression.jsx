import React, { useState, useEffect } from 'react';
import { XCircle, ShieldCheck, Search, Trash2, Download, AlertTriangle } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Suppression() {
  const [list, setList]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Suppression & Bounce List</h1>
          <p className="page-subtitle">Auto-suppressed addresses to protect your domain sender reputation</p>
        </div>
        <button className="btn-ghost"><Download size={13} /> Export List</button>
      </div>

      {/* Info banner */}
      <div style={{
        background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px',
        padding: '1rem 1.25rem', marginBottom: '1.25rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>
        <ShieldCheck size={20} style={{ color: '#059669', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#065f46' }}>Sender Reputation — Excellent</div>
          <div style={{ fontSize: '0.75rem', color: '#047857' }}>No hard bounces or spam complaints detected. Domain mail.resuming.io is in good standing.</div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
          <input className="input" style={{ paddingLeft: '2.375rem' }} placeholder="Search suppressed emails..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <XCircle size={15} style={{ color: '#dc2626' }} /> Auto-Suppressed Recipients
            <span style={{ background: '#f3f4f6', color: 'var(--text-3)', fontSize: '0.6875rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '6px' }}>0</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Excluded from all future campaigns</span>
        </div>

        <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: '#ecfdf5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <ShieldCheck size={28} style={{ color: '#059669' }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', marginBottom: '0.375rem' }}>
            No suppressed addresses
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', maxWidth: 400, margin: '0 auto' }}>
            Hard bounces and spam complaints are automatically added here.
            Your list is clean — sender reputation is protected.
          </div>
        </div>

        {/* Explanatory info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0', borderTop: '1px solid var(--border)' }}>
          {[
            { icon: '🚫', title: 'Hard Bounces',      desc: 'Permanently unreachable addresses removed after first failure' },
            { icon: '⚠️',  title: 'Spam Complaints',   desc: 'Recipients who marked your email as spam via their mail client' },
            { icon: '🔕', title: 'Manual Unsubscribes', desc: 'Users who opted out through the one-click unsubscribe link' },
          ].map((info, i) => (
            <div key={info.title} style={{
              padding: '1.25rem',
              borderRight: i < 2 ? '1px solid var(--border)' : 'none',
              borderTop: '0',
            }}>
              <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{info.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-1)', marginBottom: '0.25rem' }}>{info.title}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{info.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
