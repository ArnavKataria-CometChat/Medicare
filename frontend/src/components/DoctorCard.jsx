import React from 'react';

const DoctorCard = ({ doctor, onBook, onViewDetails }) => {
  const name = doctor.user?.name || 'Doctor';
  const specialty = doctor.specialization;
  const experience = doctor.experienceYears;
  const availability = doctor.availabilityHours;

  const getInitials = (nameStr) => {
    const cleanName = nameStr.replace(/^dr\.\s+/i, '').trim();
    const parts = cleanName.split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getSpecialtyStyles = (specStr) => {
    const lower = specStr.toLowerCase();
    let bg = 'rgba(13, 148, 136, 0.08)'; // teal
    let color = '#0d9488';
    
    if (lower.includes('cardio')) {
      bg = '#ffe4e6'; // rose
      color = '#e11d48';
    } else if (lower.includes('neuro') || lower.includes('psych')) {
      bg = '#f3e8ff'; // purple
      color = '#7c3aed';
    } else if (lower.includes('derm') || lower.includes('endo')) {
      bg = '#ffedd5'; // orange/amber
      color = '#ea580c';
    } else if (lower.includes('ortho') || lower.includes('ophthalm')) {
      bg = '#eff6ff'; // blue
      color = '#2563eb';
    } else if (lower.includes('pediat') || lower.includes('general') || lower.includes('oncology') || lower.includes('gastro')) {
      bg = '#ecfdf5'; // green/emerald
      color = '#059669';
    }
    
    return { bg, color };
  };

  const badgeStyles = getSpecialtyStyles(specialty);

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '2rem 1.5rem', gap: '1.5rem', minHeight: '340px' }}>
      
      {/* Top Section with Avatar & Availability */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Circular Gradient Avatar with Teal Gradient Initials */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
          }}
        >
          <span
            style={{
              fontWeight: '700',
              fontSize: '1.4rem',
              background: 'linear-gradient(135deg, #0d9488, #134e4a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em'
            }}
          >
            {getInitials(name)}
          </span>
        </div>

        {/* Pulse Dot Availability */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {doctor.isAvailable && <span className="pulsing-dot" />}
          {!doctor.isAvailable && <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />}
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: doctor.isAvailable ? '#10b981' : '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}
          >
            {doctor.isAvailable ? 'Available' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Main Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <h3 className="doctor-name" style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0, lineHeight: '1.4' }}>
          {name}
        </h3>
        
        {/* Specialty badge */}
        <div>
          <span
            style={{
              display: 'inline-flex',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '600',
              backgroundColor: badgeStyles.bg,
              color: badgeStyles.color,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            {specialty}
          </span>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: '0.5rem 0 0 0', flex: 1 }}>
          {doctor.bio ? `${doctor.bio.substring(0, 95)}...` : 'No biography summary details registered yet.'}
        </p>

        {/* Experience & Hours Metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Clinical Practice:</span>
            <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{experience} Years</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Availability:</span>
            <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{availability.split(' ')[0]}</span>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <button onClick={() => onViewDetails(doctor.id)} className="btn btn-secondary btn-sm" style={{ flex: 1, padding: '0.6rem 0' }}>
          Details
        </button>
        <button
          onClick={() => onBook(doctor.id, specialty, name)}
          className="btn btn-primary btn-sm"
          disabled={!doctor.isAvailable}
          style={{ flex: 1.2, padding: '0.6rem 0' }}
        >
          Book Appointment
        </button>
      </div>

    </div>
  );
};

export default DoctorCard;
