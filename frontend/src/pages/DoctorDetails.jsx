import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';

const DoctorDetails = ({ navigate, doctorId }) => {
  const { addToast } = useToast();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const response = await fetch(`/api/doctors/${doctorId}`);
        if (response.ok) {
          const data = await response.json();
          setDoctor(data);
        } else {
          addToast('Could not find doctor details.', 'error');
          navigate('/doctors');
        }
      } catch (error) {
        console.error('Fetch doctor details error:', error);
        addToast('Connection failure when loading doctor details.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctor();
  }, [doctorId, navigate, addToast]);

  const handleBook = () => {
    if (doctor) {
      navigate('/book', {
        doctorProfileId: doctor.id,
        specialization: doctor.specialization,
        doctorName: doctor.user?.name
      });
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading doctor profile details...</p>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3>Profile not found</h3>
        <button onClick={() => navigate('/doctors')} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Directory
        </button>
      </div>
    );
  }

  const image = doctor.imageUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300';
  const name = doctor.user?.name || 'Doctor';

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Breadcrumbs */}
      <div>
        <a href="/doctors" onClick={(e) => { e.preventDefault(); navigate('/doctors'); }} style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          ← Back to Directory
        </a>
      </div>

      <div className="glass-panel" style={{ padding: '3rem', display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
        {/* Left image column */}
        <div style={{ flex: '1 1 300px', maxWidth: '350px' }}>
          <img
            src={image}
            alt={name}
            style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', objectFit: 'cover', minHeight: '350px' }}
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300';
            }}
          />
        </div>

        {/* Right content column */}
        <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '2.5rem' }}>{name}</h1>
              <h3 style={{ color: 'var(--primary)', fontSize: '1.25rem', marginTop: '0.25rem' }}>{doctor.specialization}</h3>
            </div>
            <span className={`badge ${doctor.isAvailable ? 'badge-success' : 'badge-danger'}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
              {doctor.isAvailable ? 'Available for Booking' : 'Offline'}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '1.5rem',
              padding: '1rem 0',
              borderTop: '1px solid var(--border-glass)',
              borderBottom: '1px solid var(--border-glass)',
              fontSize: '0.95rem'
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Experience:</span>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{doctor.experienceYears} Years</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Office Hours:</span>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{doctor.availabilityHours}</strong>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Professional Biography</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '1rem' }}>
              {doctor.bio || `${name} is an active practitioner with Medicare. Fully certified in modern clinical methods and committed to long-term patient wellbeing.`}
            </p>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
            <button
              onClick={handleBook}
              className="btn btn-primary"
              style={{ width: '100%', maxWidth: '260px', padding: '1rem' }}
              disabled={!doctor.isAvailable}
            >
              Book an Appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDetails;
