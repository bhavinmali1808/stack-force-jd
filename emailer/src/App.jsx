import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Send, Users, FileText, BarChart2,
  Settings, Mail, ChevronRight, LogOut, Zap
} from 'lucide-react';
import api from './api';
import store from './store/emailerStore';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Campaigns from './pages/Campaigns';
import Templates from './pages/Templates';
import Logs from './pages/Logs';
import Analytics from './pages/Analytics';

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',  Icon: LayoutDashboard, section: 'main' },
  { id: 'contacts',   label: 'Contacts',   Icon: Users,           section: 'main' },
  { id: 'campaigns',  label: 'Campaigns',  Icon: Send,            section: 'send' },
  { id: 'templates',  label: 'Templates',  Icon: FileText,        section: 'send' },
  { id: 'logs',       label: 'Activity',   Icon: Mail,            section: 'analytics' },
  { id: 'analytics',  label: 'Analytics',  Icon: BarChart2,       section: 'analytics' },
];

const PAGES = {
  dashboard:  Dashboard,
  contacts:   Contacts,
  campaigns:  Campaigns,
  templates:  Templates,
  logs:       Logs,
  analytics:  Analytics,
};

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [quota, setQuota] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    store.quota.get().then(q => setQuota(q));
  }, [activePage]);

  const PageComponent = PAGES[activePage] || Dashboard;
  const sections = {
    main:      NAV.filter(n => n.section === 'main'),
    send:      NAV.filter(n => n.section === 'send'),
    analytics: NAV.filter(n => n.section === 'analytics'),
  };

  const usedPct = quota
    ? Math.min(100, Math.round((quota.sentCount / (typeof quota.dailyLimit === 'number' ? quota.dailyLimit : 999)) * 100))
    : 0;

  return (
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon"><Zap size={16} /></div>
            <span className="logo-text">Stack<span>Force</span> Mail</span>
          </div>
        </div>

        {/* Main nav */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Main</div>
          {sections.main.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-item ${activePage === id ? 'active' : ''}`}
              onClick={() => setActivePage(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Send nav */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Send</div>
          {sections.send.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-item ${activePage === id ? 'active' : ''}`}
              onClick={() => setActivePage(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Analytics nav */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Reports</div>
          {sections.analytics.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-item ${activePage === id ? 'active' : ''}`}
              onClick={() => setActivePage(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Quota bar */}
        {quota && (
          <div className="quota-bar-container">
            <div className="quota-label">
              <span>Daily Quota</span>
              {quota.isUnlimited ? (
                <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>∞ Unlimited</span>
              ) : (
                <span style={{ color: usedPct > 80 ? 'var(--color-warning)' : 'var(--color-text-2)' }}>
                  {quota.sentCount}/{typeof quota.dailyLimit === 'number' ? quota.dailyLimit : '∞'}
                </span>
              )}
            </div>
            {quota.isUnlimited ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'linear-gradient(90deg, #10b981, #34d399)', opacity: 0.7 }} />
                <span style={{ fontSize: 10, color: 'var(--color-success)', fontWeight: 700 }}>ADMIN</span>
              </div>
            ) : (
              <div className="quota-bar">
                <div
                  className="quota-bar-fill"
                  style={{
                    width: `${usedPct}%`,
                    background: usedPct > 80
                      ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                      : undefined,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="nav-item">
            <Settings size={15} />
            Settings
          </button>
          <button className="nav-item">
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">
        <PageComponent
          quota={quota}
          showToast={showToast}
          onNavigate={setActivePage}
        />
      </main>

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)}>×</button>
        </div>
      )}
    </div>
  );
}
