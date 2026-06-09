import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const StaffSchedule = ({ navigate }) => {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [specialty, setSpecialty] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');

  const specialties = [
    'Cardiology', 'Neurology', 'Dermatology', 'Orthopedics', 'Pediatrics', 
    'General Medicine', 'Psychiatry', 'Oncology', 'Ophthalmology', 'Gastroenterology', 'Endocrinology'
  ];

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/appointments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
        setFilteredAppointments(data);
      } else {
        addToast('Failed to fetch schedule.', 'error');
      }
    } catch (error) {
      console.error('Fetch schedule error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSchedule();
    }
  }, [token]);

  // Apply filters locally on state changes
  useEffect(() => {
    let filtered = [...appointments];

    if (specialty) {
      filtered = filtered.filter(
        (a) => a.doctorProfile?.specialization?.toLowerCase() === specialty.toLowerCase()
      );
    }

    if (date) {
      filtered = filtered.filter((a) => a.appointmentDate === date);
    }

    if (status) {
      filtered = filtered.filter((a) => a.status === status);
    }

    setFilteredAppointments(filtered);
  }, [specialty, date, status, appointments]);

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div>
        <h1 style={{ fontSize: '2rem' }}>Hospital <span className="gradient-text">Coordinated Schedule</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Read-only list of all clinic appointments. Use filters below to coordinate daily patient flow.
        </p>
      </div>

      {/* Filters Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'flex-end'
        }}
      >
        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '180px' }}>
          <label className="form-label">Specialty</label>
          <select
            className="form-control"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          >
            <option value="">All Specialties</option>
            {specialties.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '180px' }}>
          <label className="form-label">Specific Date</label>
          <input
            type="date"
            className="form-control"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '180px' }}>
          <label className="form-label">Status</label>
          <select
            className="form-control"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <button
          onClick={() => {
            setSpecialty('');
            setDate('');
            setStatus('');
          }}
          className="btn btn-secondary btn-sm"
          style={{ height: '42px' }}
        >
          Reset Filters
        </button>
      </div>

      {/* Results table */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading clinic schedules...</p>
        ) : filteredAppointments.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Contact Email</th>
                  <th>Doctor Name</th>
                  <th>Specialty</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appt) => (
                  <tr key={appt.id}>
                    <td style={{ fontWeight: '600' }}>{appt.patient?.name}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{appt.patient?.email}</td>
                    <td>{appt.doctorProfile?.user?.name}</td>
                    <td style={{ color: 'var(--primary)' }}>{appt.doctorProfile?.specialization}</td>
                    <td>{appt.appointmentDate}</td>
                    <td>{appt.appointmentTime}</td>
                    <td>
                      <span className={`badge ${appt.status === 'confirmed' ? 'badge-success' : 'badge-danger'}`}>
                        {appt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
            No appointments matched your query.
          </p>
        )}
      </div>

    </div>
  );
};

export default StaffSchedule;
