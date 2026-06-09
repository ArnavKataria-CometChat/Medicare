import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Confirmation = ({ navigate, appointmentId }) => {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointmentDetail = async () => {
      try {
        const response = await fetch('/api/appointments', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          const match = data.find((a) => a.id === appointmentId);
          if (match) {
            setAppointment(match);
          } else {
            addToast('Could not find confirmation records.', 'error');
            navigate('/dashboard');
          }
        }
      } catch (error) {
        console.error('Fetch appointment detail error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token && appointmentId) {
      fetchAppointmentDetail();
    }
  }, [token, appointmentId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading booking confirmation details...</p>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3>Confirmation record not found</h3>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const doctorName = appointment.doctorProfile?.user?.name || 'Doctor';
  const specialty = appointment.doctorProfile?.specialization;

  return (
    <div className="animate-fade" style={{ maxWidth: '540px', margin: '0 auto', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Large Emerald Checkmark Circle */}
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: '#ecfdf5',
          border: '2px solid #10b981',
          color: '#10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1 className="main-page-title" style={{ fontSize: '1.8rem', textAlign: 'center', marginBottom: '0.5rem', letterSpacing: '0.2em' }}>
        Booking <span style={{ color: 'var(--primary)', fontWeight: '400' }}>Confirmed</span>
      </h1>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
        Your clinical consultation has been successfully scheduled and verified.
      </p>

      {/* Modern Receipt-style Card */}
      <div
        className="glass-card"
        style={{
          width: '100%',
          padding: 0,
          overflow: 'hidden',
          background: 'linear-gradient(to bottom, #ffffff, #f8fafc)',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
          marginBottom: '2.5rem'
        }}
      >
        {/* Teal Header Strip */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0d9488, #134e4a)',
            padding: '1.25rem 2rem',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)' }}>
            Official Receipt
          </span>
          <span style={{ fontSize: '0.8rem', opacity: '0.85' }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* Card Body */}
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Booking ID Ticket Badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Booking Reference
            </span>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                fontWeight: '700',
                color: 'var(--primary)',
                backgroundColor: 'var(--primary-glow)',
                border: '1px dashed rgba(13, 148, 136, 0.3)',
                padding: '0.25rem 0.75rem',
                borderRadius: '6px'
              }}
            >
              ID: {appointmentId.substring(0, 8).toUpperCase()}
            </span>
          </div>

          <div style={{ borderTop: '1px dashed #e2e8f0', margin: '0.5rem 0' }}></div>

          {/* Doctor Detail */}
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
              Specialist Physician
            </span>
            <p style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
              {doctorName}
            </p>
            <p style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              {specialty}
            </p>
          </div>

          {/* Date & Time Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>
                Consultation Date
              </span>
              <p style={{ fontWeight: '600', color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem' }}>
                📅 {appointment.appointmentDate}
              </p>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>
                Scheduled Time
              </span>
              <p style={{ fontWeight: '600', color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem' }}>
                🕒 {appointment.appointmentTime}
              </p>
            </div>
          </div>

          {/* Visit Reason */}
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>
              Reason for Visit
            </span>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              {appointment.reason || 'Routine clinical assessment and wellness review'}
            </p>
          </div>

          <div style={{ borderTop: '1px dashed #e2e8f0', margin: '0.5rem 0' }}></div>

          {/* Verification Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Status
            </span>
            <span
              className="badge"
              style={{
                backgroundColor: '#ecfdf5',
                color: '#10b981',
                padding: '0.3rem 0.85rem',
                fontSize: '0.7rem',
                borderRadius: '9999px',
                fontWeight: '700'
              }}
            >
              {appointment.status}
            </span>
          </div>

        </div>
      </div>

      {/* Action Navigation CTAs */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', width: '100%' }}>
        <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ flex: 1 }}>
          Go to Dashboard
        </button>
        <button onClick={() => navigate('/appointments')} className="btn btn-primary" style={{ flex: 1 }}>
          View Appointments
        </button>
      </div>

    </div>
  );
};

export default Confirmation;
