import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const AdminLogin = ({ navigate }) => {
  const { login } = useAuth();
  const { addToast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const renderFieldError = (field) => {
    if (!errors[field]) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ef4444', fontSize: '0.8rem', marginTop: '0.35rem', fontWeight: '500' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
        <span>{errors[field]}</span>
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    let localErrors = {};
    if (!email.trim()) {
      localErrors.email = 'Admin Email is required.';
    }
    if (!password) {
      localErrors.password = 'Password is required.';
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        await login(data.token, data.user);
        navigate('/admin');
      } else {
        const errMsg = data.error || 'Access Denied. Invalid admin credentials.';
        if (errMsg.toLowerCase().includes('email')) {
          setErrors({ email: errMsg });
        } else if (errMsg.toLowerCase().includes('password') || errMsg.toLowerCase().includes('denied') || errMsg.toLowerCase().includes('invalid')) {
          setErrors({ password: errMsg });
        } else {
          setErrors({ password: errMsg });
        }
      }
    } catch (error) {
      console.error('Admin login error:', error);
      setErrors({ password: 'Connection failure during login.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', borderTop: '4px solid var(--secondary)' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', textAlign: 'center' }}>
          MediCare <span className="gradient-text">Admin Panel</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem', textAlign: 'center' }}>
          Secure system administrator login window. All sessions are logged.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="form-group">
            <label className="form-label">Admin Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. admin@medicare.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
            {renderFieldError('email')}
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Security Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            {renderFieldError('password')}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }} disabled={loading}>
            {loading ? 'Authenticating Admin...' : 'Enter Console'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem' }}>
          <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }} style={{ color: 'var(--text-muted)' }}>
            ← Back to Patient & Medical Login
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
