import React from 'react';
import { useAuth } from '../context/AuthContext';

const AdminLayout = ({ children, currentPath, navigate }) => {
  const { user, logout } = useAuth();

  const handleNavClick = (e, path) => {
    e.preventDefault();
    navigate(path);
  };

  const menuItems = [
    { label: 'Overview', path: '/admin' },
    { label: 'Users', path: '/admin/users' },
    { label: 'Articles', path: '/admin/articles' },
    { label: 'Activity Logs', path: '/admin/activities' },
    { label: 'Notification Logs', path: '/admin/notifications' }
  ];

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div style={{ marginBottom: '2rem', padding: '0 1rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }} className="gradient-text">
            Admin Console
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Logged in: {user?.name}</p>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {menuItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => handleNavClick(e, item.path)}
              className={`sidebar-link ${currentPath === item.path ? 'active' : ''}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div style={{ padding: '0 1rem', marginTop: 'auto' }}>
          <button onClick={logout} className="btn btn-danger btn-sm" style={{ width: '100%' }}>
            Exit Admin
          </button>
        </div>
      </aside>

      <main className="dashboard-content">{children}</main>
    </div>
  );
};

export default AdminLayout;
