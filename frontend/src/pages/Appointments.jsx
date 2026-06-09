import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Appointments = ({ navigate }) => {
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
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
      } else {
        addToast('Failed to fetch appointments.', 'error');
      }
    } catch (error) {
      console.error('Fetch appointments error:', error);
      addToast('Connection failed when listing appointments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAppointments();
    }
  }, [token]);

  const handleCancel = async (apptId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/appointments/${apptId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        addToast('Appointment cancelled successfully.', 'success');
        fetchAppointments(); // Reload
      } else {
        const data = await response.json();
        addToast(data.error || 'Failed to cancel appointment.', 'error');
      }
    } catch (error) {
      console.error('Cancel appointment error:', error);
      addToast('Network error while cancelling.', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading appointments calendar...</p>
      </div>
    );
  }

  const isPatient = user.role === 'PATIENT';

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div>
        <h1 style={{ fontSize: '2rem' }}>
          {isPatient ? 'My Scheduled' : 'My Practice'} <span className="gradient-text">Appointments</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {isPatient 
            ? 'View dates, times, specialist details, or cancel your consultations.' 
            : 'Track patient schedules and review health record links.'}
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        {appointments.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>{isPatient ? 'Doctor Name' : 'Patient Name'}</th>
                  {isPatient && <th>Specialty</th>}
                  <th>Date</th>
                  <th>Time</th>
                  <th>Reason for Visit</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => {
                  const targetUser = isPatient 
                    ? appt.doctorProfile?.user?.name 
                    : appt.patient?.name;
                  const specialty = appt.doctorProfile?.specialization;

                  return (
                    <tr key={appt.id}>
                      <td style={{ fontWeight: '600' }}>{targetUser}</td>
                      {isPatient && <td style={{ color: 'var(--primary)' }}>{specialty}</td>}
                      <td>{appt.appointmentDate}</td>
                      <td>{appt.appointmentTime}</td>
                      <td>{appt.reason || 'General check-up'}</td>
                      <td>
                        <span className={`badge ${appt.status === 'confirmed' ? 'badge-success' : 'badge-danger'}`}>
                          {appt.status}
                        </span>
                      </td>
                      <td style={{ display: 'flex', gap: '0.5rem' }}>
                        {!isPatient && appt.status === 'confirmed' && (
                          <button
                            onClick={() => navigate(`/patients/${appt.patientId}`)}
                            className="btn btn-secondary btn-sm"
                          >
                            View Records
                          </button>
                        )}
                        {appt.status === 'confirmed' && (
                          <button
                            onClick={() => handleCancel(appt.id)}
                            className="btn btn-danger btn-sm"
                          >
                            Cancel
                          </button>
                        )}
                        {appt.status === 'cancelled' && (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No actions</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <p>No appointments scheduled currently.</p>
            {isPatient && (
              <button onClick={() => navigate('/doctors')} className="btn btn-primary btn-sm" style={{ marginTop: '1.5rem' }}>
                Schedule Consultation Now
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Appointments;
