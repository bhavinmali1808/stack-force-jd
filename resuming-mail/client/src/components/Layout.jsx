import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  LayoutDashboard, Send, FileText, Users, GitBranch,
  ListOrdered, BarChart2, Layers, FileSearch, XCircle,
  Cpu, LogOut, Bell, ChevronDown, Wifi, WifiOff, Zap
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/campaigns',  icon: Send,            label: 'Campaigns'    },
  { to: '/templates',  icon: FileText,        label: 'Templates'    },
  { to: '/audience',   icon: Users,           label: 'Audience'     },
  { to: '/segments',   icon: GitBranch,       label: 'Segments'     },
  { to: '/analytics',  icon: BarChart2,       label: 'Analytics'    },
  { to: '/queue',      icon: ListOrdered,     label: 'Email Queue'  },
  { to: '/logs',       icon: FileSearch,      label: 'Logs'         },
  { to: '/suppression',icon: XCircle,         label: 'Suppression'  },
  { to: '/health',     icon: Cpu,             label: 'System Health'},
];

let socket;

export default function Layout() {
  const { admin, logout } = useAuthStore();
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [queueDepth, setQueueDepth] = useState(0);

  useEffect(() => {
    socket = io('/', { withCredentials: true, transports: ['websocket', 'polling'] });
    socket.on('connect',     () => setConnected(true));
    socket.on('disconnect',  () => setConnected(false));
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

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* ── Sidebar ──────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 flex flex-col" style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>Resuming.io</div>
            <div className="text-xs" style={{ color: 'var(--text-3)' }}>Mail Platform</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto flex flex-col gap-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: status + user */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Connection status */}
          <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg" style={{ background: 'var(--bg-card)' }}>
            {connected
              ? <><Wifi size={12} style={{ color: 'var(--green)' }} /><span className="text-xs" style={{ color: 'var(--green)' }}>Live</span></>
              : <><WifiOff size={12} style={{ color: 'var(--red)' }}  /><span className="text-xs" style={{ color: 'var(--red)' }}>Offline</span></>
            }
            {queueDepth > 0 && (
              <span className="ml-auto text-xs badge badge-amber">{queueDepth.toLocaleString()} queued</span>
            )}
          </div>

          {/* Admin info */}
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {admin?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>{admin?.name}</div>
              <div className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{admin?.role}</div>
            </div>
            <button onClick={handleLogout} className="p-1 rounded hover:bg-red-500/10 transition-colors" title="Logout">
              <LogOut size={14} style={{ color: 'var(--text-3)' }} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--indigo)' }}>
            mail.resuming.io
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full" style={{ background: 'var(--bg-card)', color: 'var(--text-2)' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: connected ? 'var(--green)' : 'var(--red)' }} />
              {connected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
