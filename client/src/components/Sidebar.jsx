import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Home, Search, LayoutGrid, MessageSquare, Users, Mail, Zap, ChevronRight, Layers } from 'lucide-react';

export default function Sidebar() {
  const { company, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Projects', path: '/projects', icon: LayoutGrid, activeCheck: '/projects' },
    { name: 'Chat History', path: '/chat', icon: MessageSquare },
    { name: 'Workspace', path: '/workspace', icon: Users },
    { name: 'Email Accounts', path: '/email', icon: Mail },
    { name: 'Usage & Billing', path: '/billing', icon: Zap },
  ];

  return (
    <div className="sidebar" style={{ borderRight: '1px solid #E5E7EB', backgroundColor: '#FAFBFD' }}>
      <div className="sidebar-header" style={{ padding: '1.25rem 1.5rem', marginBottom: '0.5rem' }}>
        <Link to="/dashboard" className="sidebar-brand" style={{ color: '#4F46E5', fontSize: '1.3rem', gap: '0.6rem' }}>
          <Layers size={26} strokeWidth={2.5} /> TalentForce
        </Link>
      </div>

      <div className="sidebar-menu" style={{ padding: '0 0.875rem' }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.activeCheck && location.pathname.startsWith(item.activeCheck));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              style={{
                color: isActive ? '#4F46E5' : '#4B5563',
                backgroundColor: isActive ? '#F3F4F6' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                padding: '0.6rem 0.75rem',
                fontSize: '0.875rem',
                marginBottom: '0.1rem',
                borderRadius: '8px'
              }}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} style={{ opacity: isActive ? 1 : 0.8 }} />
              {item.name}
              {item.badge && (
                <span className="sidebar-badge" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>{item.badge}</span>
              )}
            </Link>
          );
        })}
      </div>

      {company && (
        <div className="sidebar-footer" onClick={handleLogout} title="Click to sign out" style={{ borderTop: 'none', padding: '1.5rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#4F46E5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', fontWeight: 600, color: '#fff',
            }}>
              {company.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{company.name || 'Bhavin Mali'}</p>
              <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{company.industry || 'Xstudio'}</p>
            </div>
            <ChevronRight size={16} color="#9CA3AF" />
          </div>
        </div>
      )}
    </div>
  );
}
