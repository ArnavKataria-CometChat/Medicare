import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Register = ({ navigate }) => {
  const { login } = useAuth();
  const { addToast } = useToast();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleMonthChange = (val) => {
    // Only digits up to 2 characters
    const cleanVal = val.replace(/\D/g, '').substring(0, 2);
    // placeholder or no-op since this is registration, not booking
  };

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
    if (!name.trim()) {
      localErrors.name = 'Full name is required.';
    }

    if (!email.trim()) {
      localErrors.email = 'Email address is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        localErrors.email = 'Email must match the pattern s@s.a (e.g., user@domain.com).';
      }
    }

    if (password.length < 6) {
      localErrors.password = 'Password must be at least 6 characters.';
    }

    let cleanPhone = '';
    if (phone) {
      cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        localErrors.phone = 'Phone number must be exactly 10 digits.';
      }
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, phone: cleanPhone || null })
      });

      const data = await response.json();

      if (response.ok) {
        await login(data.token, data.user);
        addToast('Welcome to MediCare! Your account is created.', 'success');
        navigate('/dashboard');
      } else {
        const errMsg = data.error || 'Registration failed.';
        if (errMsg.toLowerCase().includes('email')) {
          setErrors({ email: errMsg });
        } else if (errMsg.toLowerCase().includes('phone')) {
          setErrors({ phone: errMsg });
        } else if (errMsg.toLowerCase().includes('password')) {
          setErrors({ password: errMsg });
        } else {
          setErrors({ name: errMsg });
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ name: 'Connection failure. Try again later.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', textAlign: 'center' }}>
          Create a <span className="gradient-text">Patient Account</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', textAlign: 'center' }}>
          Sign up to search doctors, book appointments, and maintain health records.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
            {renderFieldError('name')}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. johndoe@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
            {renderFieldError('email')}
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number (Optional)</label>
            <input
              type="tel"
              className="form-control"
              placeholder="e.g. +1 (555) 019-2834"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
            {renderFieldError('phone')}
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Password *</label>
            <input
              type="password"
              className="form-control"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            {renderFieldError('password')}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }} style={{ fontWeight: '600' }}>
            Log in instead
          </a>
        </div>
      </div>
    </div>
  );
};

export default Register;
