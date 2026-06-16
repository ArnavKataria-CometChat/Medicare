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
        fetchAppointments();
      } else {
        const data = await response.json();
        addToast(data.error || 'Failed to cancel appointment.', 'error');
      }
    } catch (error) {
      console.error('Cancel appointment error:', error);
      addToast('Network error while cancelling.', 'error');
    }
  };

  const handleRequestChat = async (apptId) => {
    try {
      const response = await fetch(`/api/appointments/${apptId}/request-chat`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        addToast('Chat request sent to the doctor.', 'success');
        fetchAppointments();
      } else {
        const data = await response.json();
        addToast(data.error || 'Failed to send chat request.', 'error');
      }
    } catch (error) {
      addToast('Network error while requesting chat.', 'error');
    }
  };

  const handleAcceptChat = async (apptId) => {
    try {
      const response = await fetch(`/api/appointments/${apptId}/accept-chat`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        addToast('Chat request accepted. You can now chat with the patient.', 'success');
        fetchAppointments();
      } else {
        const data = await response.json();
        addToast(data.error || 'Failed to accept chat request.', 'error');
      }
    } catch (error) {
      addToast('Network error while accepting chat.', 'error');
    }
  };

  const handleDeclineChat = async (apptId) => {
    try {
      const response = await fetch(`/api/appointments/${apptId}/decline-chat`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        addToast('Chat request declined.', 'info');
        fetchAppointments();
      } else {
        const data = await response.json();
        addToast(data.error || 'Failed to decline chat request.', 'error');
      }
    } catch (error) {
      addToast('Network error while declining chat.', 'error');
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
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
        {isPatient && (
          <button
            className="btn btn-primary"
            onClick={() => navigate('/doctors')}
            style={{ whiteSpace: 'nowrap', marginTop: '0.5rem' }}
          >
            + Book Specialist
          </button>
        )}
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
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {/* Container 1: Records & Cancel */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.4rem 0.6rem', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            {!isPatient && (
                              <button
                                onClick={() => navigate(`/patients/${appt.patientId}`)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                              >
                                View Records
                              </button>
                            )}
                            {appt.status === 'confirmed' ? (
                              <button
                                onClick={() => handleCancel(appt.id)}
                                className="btn btn-danger btn-sm"
                                style={{ fontSize: '0.75rem' }}
                              >
                                Cancel
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>Cancelled</span>
                            )}
                          </div>

                          {/* Container 2: Chat Actions */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.4rem 0.6rem', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '90px', alignItems: 'center', justifyContent: 'center' }}>
                            {appt.status === 'cancelled' ? (
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center' }}>Chat ended</span>
                            ) : (
                              <>
                                {/* Patient chat actions */}
                                {isPatient && appt.chatRequestStatus === 'none' && (
                                  <button
                                    onClick={() => handleRequestChat(appt.id)}
                                    className="btn btn-primary btn-sm"
                                    style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                  >
                                    Request Chat
                                  </button>
                                )}
                                {isPatient && appt.chatRequestStatus === 'pending' && (
                                  <span className="badge badge-warning" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}>Pending</span>
                                )}
                                {isPatient && appt.chatRequestStatus === 'accepted' && (
                                  <button
                                    onClick={() => navigate('/chats')}
                                    className="btn btn-sm"
                                    style={{ background: '#10b981', color: 'white', border: 'none', fontSize: '0.75rem' }}
                                  >
                                    Chat Now
                                  </button>
                                )}
                                {isPatient && appt.chatRequestStatus === 'declined' && (
                                  <span className="badge badge-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}>Declined</span>
                                )}

                                {/* Doctor chat actions */}
                                {!isPatient && appt.chatRequestStatus === 'none' && (
                                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center' }}>No request</span>
                                )}
                                {!isPatient && appt.chatRequestStatus === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleAcceptChat(appt.id)}
                                      className="btn btn-sm"
                                      style={{ background: '#10b981', color: 'white', border: 'none', fontSize: '0.75rem' }}
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={() => handleDeclineChat(appt.id)}
                                      className="btn btn-danger btn-sm"
                                      style={{ fontSize: '0.75rem' }}
                                    >
                                      Decline
                                    </button>
                                  </>
                                )}
                                {!isPatient && appt.chatRequestStatus === 'accepted' && (
                                  <button
                                    onClick={() => navigate('/chats')}
                                    className="btn btn-sm"
                                    style={{ background: '#10b981', color: 'white', border: 'none', fontSize: '0.75rem' }}
                                  >
                                    Chat Now
                                  </button>
                                )}
                                {!isPatient && appt.chatRequestStatus === 'declined' && (
                                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center' }}>Declined</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
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
