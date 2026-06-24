import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AIAssistant from './AIAssistant';
import NotificationBell from './NotificationBell';

const Layout = ({ children, currentPath, navigate }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (e, path) => {
    e.preventDefault();
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    navigate(path);
  };

  const getLinks = () => {
    if (!isAuthenticated) {
      return [
        { label: 'Home', path: '/' },
        { label: 'Doctors', path: '/doctors' },
        { label: 'Articles', path: '/articles' },
        { label: 'Login', path: '/login' },
        { label: 'Register', path: '/register' }
      ];
    }

    const links = [{ label: 'Dashboard', path: '/dashboard' }];

    if (user?.role === 'PATIENT') {
      links.push(
        { label: 'Articles', path: '/articles' },
        { label: 'My Appointments', path: '/appointments' },
        { label: 'Chats', path: '/chats' }
      );
    } else if (user?.role === 'DOCTOR') {
      links.push(
        { label: 'Schedule', path: '/appointments' },
        { label: 'Chats', path: '/chats' }
      );
    } else if (user?.role === 'STAFF') {
      links.push({ label: 'System Schedule', path: '/schedule' });
    }

    return links;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const cleanName = name.replace(/^dr\.\s+/i, '').trim();
    const parts = cleanName.split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const navLinks = getLinks();

  return (
    <div className="app-container">
      <header className="navbar">
        <a href="/" onClick={(e) => handleNavClick(e, '/')} className="nav-brand">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginRight: '0.2rem' }}
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          Medi<span>Care</span>
        </a>

        <nav className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {navLinks.map((link) => (
            <a
              key={link.path}
              href={link.path}
              onClick={(e) => handleNavClick(e, link.path)}
              className={`nav-link ${currentPath === link.path ? 'active' : ''}`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
          {/* Notification Bell */}
          {isAuthenticated && user && <NotificationBell navigate={navigate} />}

          {/* Avatar Dropdown */}
          {isAuthenticated && user && (
            <div style={{ position: 'relative', marginLeft: '0.5rem' }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(13, 148, 136, 0.15)'
                }}
              >
                {getInitials(user.name)}
              </button>
              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '48px',
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1rem',
                    minWidth: '220px',
                    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    textAlign: 'left'
                  }}
                >
                  <div>
                    <p style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0 }}>{user.name}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'capitalize', margin: 0 }}>Role: {user.role.toLowerCase()}</p>
                  </div>
                  <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.25rem 0' }}></div>
                  {(user.role === 'DOCTOR' || user.role === 'PATIENT') && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/profile');
                      }}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        background: 'none',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        color: 'var(--text-primary)',
                        fontWeight: '500',
                        textAlign: 'left'
                      }}
                    >
                      My Profile
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="btn btn-danger btn-sm"
                    style={{ width: '100%', padding: '0.5rem' }}
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile menu toggle button */}
          <button
            className="mobile-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`toggle-icon ${mobileMenuOpen ? 'open' : ''}`}
            >
              <line x1="4" y1="12" x2="20" y2="12" className="line-middle"></line>
              <line x1="4" y1="6" x2="20" y2="6" className="line-top"></line>
              <line x1="4" y1="18" x2="20" y2="18" className="line-bottom"></line>
            </svg>
          </button>
        </div>
      </header>

      <main className="main-content">{children}</main>

      {currentPath !== '/chats' && <footer
        style={{
          background: '#0f172a',
          color: '#94a3b8',
          padding: '4rem 2rem 2rem 2rem',
          borderTop: '1px solid #1e293b',
          fontSize: '0.85rem',
          fontFamily: 'var(--font-primary)'
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2.5rem',
            textAlign: 'left',
            marginBottom: '3rem'
          }}
        >
          {/* Column 1: Logo & Info */}
          <div>
            <h3 style={{ color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: '600' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              MediCare
            </h3>
            <p style={{ lineHeight: '1.6', color: '#64748b' }}>
              A premium, clinical consultation and health management platform designed for modern medical care.
            </p>
          </div>

          {/* Column 2: Portal links */}
          <div>
            <h4 style={{ color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', marginBottom: '1rem' }}>Portal Navigation</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><a href="/" onClick={(e) => handleNavClick(e, '/')} style={{ color: '#94a3b8' }}>Home</a></li>
              <li><a href="/doctors" onClick={(e) => handleNavClick(e, '/doctors')} style={{ color: '#94a3b8' }}>Doctors Directory</a></li>
              <li><a href="/articles" onClick={(e) => handleNavClick(e, '/articles')} style={{ color: '#94a3b8' }}>Health Library</a></li>
            </ul>
          </div>

          {/* Column 3: Legal / Privacy */}
          <div>
            <h4 style={{ color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', marginBottom: '1rem' }}>Security & Legal</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#64748b' }}>
              <li>HIPAA Secured System</li>
              <li>Patient Privacy Policy</li>
              <li>Terms of Medical Service</li>
            </ul>
          </div>

          {/* Column 4: Contact Info with Teal Icons */}
          <div>
            <h4 style={{ color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', marginBottom: '1rem' }}>Contact Office</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span style={{ color: '#94a3b8' }}>+1 (555) 019-8800</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span style={{ color: '#94a3b8' }}>support@medicare.com</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span style={{ color: '#94a3b8' }}>742 Evergreen Terrace, NY</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '1.5rem', textAlign: 'center', color: '#475569', fontSize: '0.75rem' }}>
          <p>&copy; {new Date().getFullYear()} MediCare Inc. All clinical records are secured and audited under strict standards.</p>
        </div>
      </footer>}

      {isAuthenticated && currentPath !== '/chats' && <AIAssistant navigate={navigate} />}
    </div>
  );
};

export default Layout;
