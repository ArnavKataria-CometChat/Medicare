import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const BookAppointment = ({ navigate, navigationState }) => {
  const { token } = useAuth();
  const { addToast } = useToast();

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(
    (navigationState && navigationState.doctorProfileId) || ''
  );
  
  // Default values to tomorrow's date
  const getTomorrowValues = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return {
      month: String(tomorrow.getMonth() + 1).padStart(2, '0'),
      day: String(tomorrow.getDate()).padStart(2, '0')
    };
  };

  const tomorrowVals = getTomorrowValues();
  const [selectedMonth, setSelectedMonth] = useState(tomorrowVals.month);
  const [selectedDay, setSelectedDay] = useState(tomorrowVals.day);
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const timeSlots = [
    '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'
  ];

  // Fetch doctors if none pre-selected, or to display list
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await fetch('/api/doctors?isAvailable=true');
        if (response.ok) {
          const data = await response.json();
          setDoctors(data);
        }
      } catch (error) {
        console.error('Fetch doctors booking list error:', error);
      }
    };
    fetchDoctors();
  }, []);

  const handleMonthChange = (val) => {
    const cleanVal = val.replace(/\D/g, '').substring(0, 2);
    setSelectedMonth(cleanVal);
  };

  const handleDayChange = (val) => {
    const cleanVal = val.replace(/\D/g, '').substring(0, 2);
    setSelectedDay(cleanVal);
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

    if (!selectedDoctorId) {
      localErrors.doctor = 'Please select a medical specialist.';
    }

    if (!selectedMonth || !selectedDay) {
      localErrors.date = 'Please enter a valid month and a day.';
    }

    const monthNum = parseInt(selectedMonth, 10);
    const dayNum = parseInt(selectedDay, 10);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      localErrors.date = 'Please enter a valid month between 01 and 12.';
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Automatically roll year forward if selecting a month earlier in the calendar (crossing year boundary)
    let year = currentYear;
    if (!isNaN(monthNum) && monthNum < currentMonth) {
      year += 1;
    }

    const maxDays = new Date(year, monthNum, 0).getDate();
    if (isNaN(dayNum) || dayNum < 1 || dayNum > maxDays) {
      localErrors.date = `Please enter a valid day between 01 and ${maxDays} for the selected month.`;
    }

    const formattedMonth = String(monthNum).padStart(2, '0');
    const formattedDay = String(dayNum).padStart(2, '0');
    const formattedDate = `${year}-${formattedMonth}-${formattedDay}`;

    // Perform date range validation: [tomorrow, 1 month ahead]
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const minAllowedDate = new Date(todayDate);
    minAllowedDate.setDate(todayDate.getDate() + 1);

    const maxAllowedDate = new Date(todayDate);
    maxAllowedDate.setMonth(todayDate.getMonth() + 1);

    const chosenDate = new Date(`${year}-${formattedMonth}-${formattedDay}T00:00:00`);

    if (!localErrors.date && (chosenDate < minAllowedDate || chosenDate > maxAllowedDate)) {
      const minStr = minAllowedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const maxStr = maxAllowedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      localErrors.date = `Consultations can only be scheduled from tomorrow (${minStr}) up to one month in advance (${maxStr}).`;
    }

    if (!time) {
      localErrors.time = 'Please select an available time slot.';
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          doctorProfileId: selectedDoctorId,
          appointmentDate: formattedDate,
          appointmentTime: time,
          reason
        })
      });

      const data = await response.json();

      if (response.ok) {
        addToast('Appointment booked successfully!', 'success');
        navigate(`/confirmation/${data.appointment.id}`);
      } else {
        const errMsg = data.error || 'Failed to book appointment.';
        if (errMsg.toLowerCase().includes('slot') || errMsg.toLowerCase().includes('booked')) {
          setErrors({ time: errMsg });
        } else if (errMsg.toLowerCase().includes('doctor')) {
          setErrors({ doctor: errMsg });
        } else if (errMsg.toLowerCase().includes('date')) {
          setErrors({ date: errMsg });
        } else {
          setErrors({ doctor: errMsg });
        }
      }
    } catch (error) {
      console.error('Booking submission error:', error);
      setErrors({ doctor: 'Connection failure. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const selectedDoctorObj = doctors.find((d) => d.id === selectedDoctorId) || 
    (navigationState && { id: selectedDoctorId, user: { name: navigationState.doctorName }, specialization: navigationState.specialization });

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const monthNum = parseInt(selectedMonth, 10);
  const computedYear = currentYear + (!isNaN(monthNum) && monthNum < currentMonth ? 1 : 0);

  return (
    <div className="animate-fade" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 className="main-page-title" style={{ fontSize: '1.8rem', marginBottom: '1.5rem', letterSpacing: '0.25em' }}>
        Book an <span style={{ color: 'var(--primary)', fontWeight: '400' }}>Appointment</span>
      </h1>

      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Doctor Selection */}
          <div className="form-group">
            <label className="form-label">Select Medical Specialist</label>
            <select
              className="form-control"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              disabled={loading}
              required
            >
              <option value="">-- Choose a Doctor --</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.user?.name} ({doc.specialization})
                </option>
              ))}
            </select>
            {renderFieldError('doctor')}
          </div>

          {/* Selected Doctor Summary Card */}
          {selectedDoctorObj && selectedDoctorObj.user?.name && (
            <div
              className="glass-card"
              style={{
                padding: '1rem',
                borderLeft: '4px solid var(--primary)',
                background: 'var(--primary-glow)',
                fontSize: '0.9rem'
              }}
            >
              <p style={{ fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Selected: {selectedDoctorObj.user.name}</p>
              <p style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '600', margin: 0 }}>Specialty: {selectedDoctorObj.specialization}</p>
            </div>
          )}

          {/* Date Picker (Simplified Day & Month Text Boxes) */}
          <div className="form-group">
            <label className="form-label">Consultation Date (Month & Day)</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  placeholder="Month (MM)"
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  disabled={loading}
                  required
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Month (e.g. 06)</span>
              </div>

              <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  placeholder="Day (DD)"
                  value={selectedDay}
                  onChange={(e) => handleDayChange(e.target.value)}
                  disabled={loading}
                  required
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Day (e.g. 10)</span>
              </div>
            </div>
            {renderFieldError('date')}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Year {computedYear} imported automatically.
            </span>
          </div>

          {/* Time Slots */}
          <div className="form-group">
            <label className="form-label">Available Time Slot</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem', marginTop: '0.25rem' }}>
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className={`btn btn-sm ${time === slot ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.5rem 0' }}
                  disabled={loading}
                >
                  {slot}
                </button>
              ))}
            </div>
            {renderFieldError('time')}
          </div>

          {/* Reason */}
          <div className="form-group">
            <label className="form-label">Reason for Visit (Symptoms, request details)</label>
            <textarea
              className="form-control"
              placeholder="e.g. Annual cardiovascular physical exam, chest pressure feelings"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Processing Schedule...' : 'Confirm Appointment Booking'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookAppointment;
