import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  LayoutDashboard, Send, FileText, Users, GitBranch,
  ListOrdered, BarChart2, FileSearch, XCircle,
  Cpu, Bell, Search, Settings, ChevronDown,
  Wifi, WifiOff, Circle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Overview'    },
  { to: '/campaigns',   icon: Send,            label: 'Campaigns'   },
  { to: '/templates',   icon: FileText,        label: 'Templates'   },
  { to: '/audience',    icon: Users,           label: 'Audience'    },
  { to: '/segments',    icon: GitBranch,       label: 'Segments'    },
  { to: '/analytics',   icon: BarChart2,       label: 'Analytics'   },
];

const NAV_BOTTOM = [
  { to: '/queue',       icon: ListOrdered,     label: 'Email Queue' },
  { to: '/logs',        icon: FileSearch,      label: 'Logs'        },
  { to: '/suppression', icon: XCircle,         label: 'Suppression' },
  { to: '/health',      icon: Cpu,             label: 'OS & Health' },
];

let socket;

export default function Layout() {
  const { admin, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [connected, setConnected] = useState(false);
  const [queueDepth, setQueueDepth] = useState(0);

  useEffect(() => {
    socket = io('/', { withCredentials: true, transports: ['websocket', 'polling'] });
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('campaign:started', ({ name, total }) => {
      toast.success(`📧 Campaign "${name}" started — ${total.toLocaleString()} emails queued`);
    });
    socket.on('queue:update', ({ depth }) => setQueueDepth(depth));
    return () => socket.disconnect();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  /* derive breadcrumb from path */
  const pathParts = location.pathname.split('/').filter(Boolean);
  const breadcrumb = pathParts.length
    ? pathParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' › ')
    : 'Overview';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)', fontFamily: 'Inter, sans-serif' }}>

      {/* ── LEFT SIDEBAR ─────────────────────────────── */}
      <aside style={{
        width: '220px',
        background: '#ffffff',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '1.25rem 1rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'var(--purple)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: '1rem'
            }}>R</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', lineHeight: 1.2 }}>Resuming</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)', fontWeight: 500 }}>Email Platform</div>
            </div>
          </div>
        </div>

        {/* Main Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.625rem' }}>
          <div className="sidebar-section-label">Main Menu</div>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--purple)' : 'var(--text-2)',
                background: isActive ? 'var(--purple-light)' : 'transparent',
                marginBottom: '2px',
                textDecoration: 'none',
                transition: 'all 0.15s',
              })}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              <span>{label}</span>
            </NavLink>
          ))}

          <div className="sidebar-section-label" style={{ marginTop: '1.25rem' }}>System</div>
          {NAV_BOTTOM.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--purple)' : 'var(--text-2)',
                background: isActive ? 'var(--purple-light)' : 'transparent',
                marginBottom: '2px',
                textDecoration: 'none',
                transition: 'all 0.15s',
              })}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom user section */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
          {/* Connection status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 0.75rem', borderRadius: '8px',
            background: connected ? '#ecfdf5' : '#fef2f2',
            marginBottom: '0.5rem',
          }}>
            <Circle size={7} style={{ fill: connected ? '#059669' : '#dc2626', color: connected ? '#059669' : '#dc2626', flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: connected ? '#059669' : '#dc2626' }}>
              {connected ? 'Live • Connected' : 'Offline'}
            </span>
            {queueDepth > 0 && (
              <span style={{
                marginLeft: 'auto', background: '#fef3c7', color: '#92400e',
                fontSize: '0.6875rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px'
              }}>{queueDepth}</span>
            )}
          </div>

          {/* User account */}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem', width: '100%',
              padding: '0.5rem 0.75rem', borderRadius: '8px',
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--text-2)', fontSize: '0.8125rem', fontWeight: 500,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'var(--purple-mid)', color: 'var(--purple)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0,
            }}>
              {(admin?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {admin?.email?.split('@')[0] || 'Admin'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>Sign out</div>
            </div>
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ───────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top header bar */}
        <header style={{
          height: '52px',
          background: '#ffffff',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          padding: '0 1.5rem',
          flexShrink: 0,
          gap: '1rem',
        }}>
          {/* Breadcrumb */}
          <div style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--text-3)', fontWeight: 500 }}>
            Campaigns {pathParts.length > 0 && (
              <span style={{ color: 'var(--text-3)' }}>›</span>
            )} <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{breadcrumb}</span>
          </div>

          {/* Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            {/* Search trigger */}
            <button className="icon-btn" title="Search">
              <Search size={15} />
            </button>

            {/* Bell */}
            <button className="icon-btn" title="Notifications">
              <Bell size={15} />
            </button>

            {/* Account chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.3rem 0.75rem 0.3rem 0.4rem',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-1)',
            }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: 'var(--purple)',
                color: '#fff', fontSize: '0.6875rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {(admin?.email || 'A').charAt(0).toUpperCase()}
              </div>
              <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {admin?.email?.split('@')[0] || 'Workspace'}
              </span>
              <ChevronDown size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '1.75rem 2rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
