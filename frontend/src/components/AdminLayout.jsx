import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const AdminLayout = ({ children, currentPath, navigate }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleNavClick = (e, path) => {
    e.preventDefault();
    navigate(path);
    setMenuOpen(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Close menu when path changes
  useEffect(() => {
    setMenuOpen(false);
  }, [currentPath]);

  const menuItems = [
    { label: 'Overview', path: '/admin', icon: '📊' },
    { label: 'Users', path: '/admin/users', icon: '👥' },
    { label: 'Articles', path: '/admin/articles', icon: '📰' },
    { label: 'Activity Logs', path: '/admin/activities', icon: '📋' },
    { label: 'Notification Logs', path: '/admin/notifications', icon: '🔔' }
  ];

  return (
    <>
      <style>{`
        .admin-layout {
          min-height: calc(100vh - 70px);
          position: relative;
        }

        .admin-topbar {
          display: flex;
          align-items: center;
          padding: 0.75rem 1.5rem;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          gap: 1rem;
        }

        .admin-menu-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .admin-menu-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .admin-menu-btn.active {
          background: var(--primary-glow, #ccfbf1);
          border-color: var(--primary, #0d9488);
        }

        .admin-menu-dots {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .admin-menu-dots span {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #475569;
        }

        .admin-topbar-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary, #0f172a);
        }

        .admin-topbar-user {
          margin-left: auto;
          font-size: 0.78rem;
          color: var(--text-muted, #94a3b8);
        }

        .admin-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 999;
          pointer-events: none;
        }

        .admin-menu-overlay.open {
          pointer-events: auto;
        }

        .admin-menu-panel {
          position: absolute;
          top: 110px;
          left: 16px;
          width: 240px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 40px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15, 23, 42, 0.06);
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          transform: translateY(-8px);
          opacity: 0;
          transition: all 0.2s ease;
          pointer-events: none;
          z-index: 1000;
        }

        .admin-menu-panel.open {
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }

        .admin-menu-header {
          padding: 0.5rem 0.75rem 0.75rem;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 0.25rem;
        }

        .admin-menu-header h3 {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--primary, #0d9488);
          margin: 0 0 2px;
        }

        .admin-menu-header p {
          font-size: 0.7rem;
          color: var(--text-muted, #94a3b8);
          margin: 0;
        }

        .admin-menu-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          color: var(--text-secondary, #475569);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          text-decoration: none;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
        }

        .admin-menu-item:hover {
          background: #f1f5f9;
          color: var(--text-primary, #0f172a);
        }

        .admin-menu-item.active {
          background: var(--primary-glow, #ccfbf1);
          color: var(--primary, #0d9488);
          font-weight: 600;
        }

        .admin-menu-item-icon {
          font-size: 1rem;
          width: 20px;
          text-align: center;
        }

        .admin-menu-exit {
          margin-top: 0.25rem;
          padding-top: 0.5rem;
          border-top: 1px solid #f1f5f9;
        }

        .admin-menu-exit button {
          width: 100%;
          padding: 0.5rem;
          border-radius: 8px;
          border: 1px solid #fecaca;
          background: #fff5f5;
          color: #ef4444;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .admin-menu-exit button:hover {
          background: #fee2e2;
        }

        .admin-main-content {
          padding: 2rem 2.5rem;
        }
      `}</style>

      <div className="admin-layout">
        {/* Top bar with menu trigger */}
        <div className="admin-topbar">
          <button
            className={`admin-menu-btn ${menuOpen ? 'active' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle admin menu"
          >
            <div className="admin-menu-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
          <span className="admin-topbar-title">Admin Console</span>
          <span className="admin-topbar-user">{user?.name}</span>
        </div>

        {/* Floating menu panel */}
        <div ref={menuRef} className={`admin-menu-panel ${menuOpen ? 'open' : ''}`}>
          <div className="admin-menu-header">
            <h3>Navigation</h3>
            <p>Admin Panel</p>
          </div>

          {menuItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => handleNavClick(e, item.path)}
              className={`admin-menu-item ${currentPath === item.path ? 'active' : ''}`}
            >
              <span className="admin-menu-item-icon">{item.icon}</span>
              {item.label}
            </a>
          ))}

          <div className="admin-menu-exit">
            <button onClick={logout}>Exit Admin</button>
          </div>
        </div>

        {/* Main content */}
        <div className="admin-main-content">{children}</div>
      </div>
    </>
  );
};

export default AdminLayout;
