import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { HardHat, LogOut, LayoutDashboard, Database, MessageSquare, CalendarRange, Users, ClipboardCheck, Menu, X } from 'lucide-react';

export default function DashboardLayout({ children, title }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const getMenuItems = () => {
    if (!profile) return [];

    switch (profile.user_type) {
      case 'admin':
        return [
          { label: 'Overview', path: '/admin', icon: <LayoutDashboard size={20} /> },
          { label: 'Moderation', path: '/admin/moderate', icon: <ClipboardCheck size={20} /> },
          { label: 'Users', path: '/admin/users', icon: <Users size={20} /> },
          { label: 'Messages', path: '/chat', icon: <MessageSquare size={20} /> }
        ];
      case 'supplier':
        return [
          { label: 'Dashboard', path: '/supplier', icon: <LayoutDashboard size={20} /> },
          { label: 'Manage Inventory', path: '/supplier/inventory', icon: <Database size={20} /> },
          { label: 'Booking Requests', path: '/supplier/requests', icon: <CalendarRange size={20} /> },
          { label: 'Messages', path: '/chat', icon: <MessageSquare size={20} /> }
        ];
      case 'customer':
      default:
        return [
          { label: 'Explore Equipment', path: '/customer', icon: <HardHat size={20} /> },
          { label: 'My Bookings', path: '/customer/bookings', icon: <CalendarRange size={20} /> },
          { label: 'Messages', path: '/chat', icon: <MessageSquare size={20} /> }
        ];
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return <span className="badge badge-danger">Admin</span>;
      case 'supplier': return <span className="badge badge-warning">Supplier</span>;
      case 'customer':
      default: return <span className="badge badge-success">Customer</span>;
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className={`dashboard-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Sidebar mobile overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div>
          <div className="sidebar-logo-container">
            <div className="sidebar-logo" onClick={() => { navigate(menuItems[0]?.path || '/'); setIsSidebarOpen(false); }} style={{ cursor: 'pointer' }}>
              <HardHat size={26} />
              <span>ZIM<span style={{ color: 'var(--primary)' }}>RIGS</span></span>
            </div>
            <button className="sidebar-close-btn" onClick={() => setIsSidebarOpen(false)} aria-label="Close menu">
              <X size={20} />
            </button>
          </div>

          <ul className="sidebar-menu">
            {menuItems.map((item, idx) => (
              <li key={idx}>
                <div
                  onClick={() => { navigate(item.path); setIsSidebarOpen(false); }}
                  className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* User profile footer */}
        <div className="sidebar-user">
          <div style={{ marginBottom: '1rem' }}>
            <div className="sidebar-username" style={{ fontSize: '0.95rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.full_name || 'Mining Operator'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {profile?.company_name || 'Contractor'}
            </div>
            {getRoleBadge(profile?.user_type)}
          </div>

          <button
            onClick={handleLogout}
            className="sidebar-item"
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              textAlign: 'left',
              color: '#ef4444',
              paddingLeft: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              cursor: 'pointer'
            }}
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(true)} aria-label="Open menu">
              <Menu size={24} />
            </button>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', margin: 0 }}>{title}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }} className="hide-mobile">Zimbabwe Mining Portal</span>
            <ThemeToggle />
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              color: 'var(--primary)'
            }}>
              {(profile?.full_name || 'M').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main style={{ flex: 1, position: 'relative' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
