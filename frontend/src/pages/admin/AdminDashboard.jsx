import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const AdminDashboard = ({ navigate }) => {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      } else {
        addToast('Failed to load metrics.', 'error');
      }
    } catch (error) {
      console.error('Fetch metrics error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMetrics();
    }
  }, [token]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Compiling platform metrics...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div>
        <h1 style={{ fontSize: '2rem' }}>Platform <span className="gradient-text">Overview</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>System analytics, user distribution, and active logs feed.</p>
      </div>

      {metrics && (
        <>
          {/* User breakdown */}
          <section>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>User Registry Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <h3 style={{ fontSize: '2.25rem', color: 'var(--primary)' }}>{metrics.users.PATIENT}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Patients Registered</p>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <h3 style={{ fontSize: '2.25rem', color: 'var(--success)' }}>{metrics.users.DOCTOR}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Doctors Active</p>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <h3 style={{ fontSize: '2.25rem', color: 'var(--secondary)' }}>{metrics.users.STAFF}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Hospital Staff</p>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <h3 style={{ fontSize: '2.25rem', color: 'var(--text-primary)' }}>{metrics.users.total}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Accounts</p>
              </div>
            </div>
          </section>

          {/* Operational metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
            
            {/* Consultation breakdown */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                Appointments Metric
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Confirmed Bookings:</span>
                  <strong style={{ color: 'var(--success)' }}>{metrics.appointments.confirmed}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Cancelled Bookings:</span>
                  <strong style={{ color: 'var(--danger)' }}>{metrics.appointments.cancelled}</strong>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
                  <span>Cumulative Consultations:</span>
                  <span>{metrics.appointments.total}</span>
                </div>
              </div>
            </div>

            {/* Health Library & Push Stats */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                Publishing & Push Alerts
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Published Resources:</span>
                  <strong>{metrics.articles.published}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Drafts:</span>
                  <strong style={{ color: 'var(--text-muted)' }}>{metrics.articles.draft}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Delivered Notifications:</span>
                  <strong style={{ color: 'var(--success)' }}>{metrics.notifications.delivered}</strong>
                </div>
              </div>
            </div>

          </div>

          {/* Quick Actions Console */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Quick Admin Actions</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/admin/users/new')} className="btn btn-primary btn-sm">
                + Add Doctor Account
              </button>
              <button onClick={() => navigate('/admin/articles/new')} className="btn btn-primary btn-sm">
                + Publish Health Resource
              </button>
              <button onClick={() => navigate('/admin/users')} className="btn btn-secondary btn-sm">
                Manage All Users
              </button>
              <button onClick={() => navigate('/admin/articles')} className="btn btn-secondary btn-sm">
                Manage Library
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default AdminDashboard;
