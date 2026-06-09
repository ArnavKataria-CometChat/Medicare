import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Dashboard = ({ navigate }) => {
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Status toggle for doctors
  const [isOnline, setIsOnline] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch appointments
      const apptResponse = await fetch('/api/appointments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (apptResponse.ok) {
        const apptData = await apptResponse.json();
        setAppointments(apptData);
      }

      // 2. Fetch doctor profile details if doctor
      if (user.role === 'DOCTOR') {
        const profileResponse = await fetch('/api/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setDoctorProfile(profileData.doctorProfile);
          setIsOnline(profileData.doctorProfile?.isAvailable ?? true);
        }
      }
    } catch (error) {
      console.error('Fetch dashboard error:', error);
      addToast('Error synchronizing dashboard information.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user) {
      fetchDashboardData();
    }
  }, [token, user]);

  const handleStatusToggle = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isAvailable: newStatus })
      });
      if (response.ok) {
        addToast(`You are now ${newStatus ? 'Online' : 'Offline'}.`, 'success');
      } else {
        setIsOnline(!newStatus);
        addToast('Failed to update status on server.', 'error');
      }
    } catch (error) {
      setIsOnline(!newStatus);
      addToast('Network error during status toggle.', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Synchronizing profile dashboards...</p>
      </div>
    );
  }

  // --- PATIENT VIEW ---
  if (user.role === 'PATIENT') {
    const upcoming = appointments.filter(a => a.status === 'confirmed' && new Date(a.appointmentDate) >= new Date().setHours(0,0,0,0));
    const nextAppt = upcoming[0];

    return (
      <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Welcome Back, <span className="gradient-text">{user.name}</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your appointments, health library, and consult files.</p>
        </div>

        {/* Quick actions & Next Consult */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* Next Consultation Card */}
          <div className="glass-panel animate-fade" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>Next Consultation</h3>
            {nextAppt ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p style={{ fontSize: '1.1rem', fontWeight: '700' }}>{nextAppt.doctorProfile?.user?.name}</p>
                <p style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '600' }}>{nextAppt.doctorProfile?.specialization}</p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <span>📅 {nextAppt.appointmentDate}</span>
                  <span>🕒 {nextAppt.appointmentTime}</span>
                </div>
              </div>
            ) : (
              <div style={{ padding: '1rem 0', color: 'var(--text-secondary)' }}>
                No upcoming appointments. Need medical advice?
              </div>
            )}
            <button onClick={() => navigate('/doctors')} className="btn btn-primary btn-sm" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
              Schedule Consultation
            </button>
          </div>

          {/* Quick Actions Card */}
          <div className="glass-panel animate-fade" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>Account Shortcuts</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Upload new scans, prescriptions, or files, or update your clinical details.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
              <button onClick={() => navigate('/profile')} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                My Health Records
              </button>
              <button onClick={() => navigate('/articles')} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                Read Library
              </button>
            </div>
          </div>
        </div>

        {/* Recent Appointments table */}
        <div className="glass-panel animate-fade" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Recent Appointment History</h3>
            <button onClick={() => navigate('/appointments')} className="btn btn-secondary btn-sm">
              View All Appointments
            </button>
          </div>

          {appointments.length > 0 ? (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Doctor Name</th>
                    <th>Specialty</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.slice(0, 5).map((appt) => (
                    <tr key={appt.id}>
                      <td>{appt.doctorProfile?.user?.name}</td>
                      <td>{appt.doctorProfile?.specialization}</td>
                      <td>{appt.appointmentDate}</td>
                      <td>{appt.appointmentTime}</td>
                      <td>{appt.reason || 'Routine Checkup'}</td>
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
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No historical consultations logged.</p>
          )}
        </div>
      </div>
    );
  }

  // --- DOCTOR VIEW ---
  if (user.role === 'DOCTOR') {
    const upcoming = appointments.filter(a => a.status === 'confirmed');

    return (
      <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Welcome Header & Online/Offline status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem' }}>Welcome Back, <span className="gradient-text">{user.name}</span></h1>
            <p style={{ color: 'var(--text-secondary)' }}>Review patient schedules and availability.</p>
          </div>

          {/* Status Switcher */}
          <div className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-glass)' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AVAILABILITY</p>
              <strong style={{ color: isOnline ? 'var(--success)' : 'var(--danger)' }}>
                {isOnline ? 'ONLINE (Accepting Bookings)' : 'OFFLINE'}
              </strong>
            </div>
            <button
              onClick={handleStatusToggle}
              className={`btn btn-sm ${isOnline ? 'btn-danger' : 'btn-primary'}`}
            >
              Toggle {isOnline ? 'Offline' : 'Online'}
            </button>
          </div>
        </div>

        {/* Summary counts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '2rem', color: 'var(--primary)' }}>{upcoming.length}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Upcoming Consults</p>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '2rem', color: 'var(--success)' }}>{appointments.length}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Consults</p>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '2rem', color: 'var(--secondary)' }}>{doctorProfile?.experienceYears || 0} yrs</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Medical Practice</p>
          </div>
        </div>

        {/* Schedule List */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Today's Scheduled Consultations</h3>
            <button onClick={() => navigate('/appointments')} className="btn btn-secondary btn-sm">
              Full Calendar View
            </button>
          </div>

          {upcoming.length > 0 ? (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.slice(0, 10).map((appt) => (
                    <tr key={appt.id}>
                      <td>{appt.patient?.name}</td>
                      <td>{appt.appointmentDate}</td>
                      <td>{appt.appointmentTime}</td>
                      <td>{appt.reason || 'Checkup'}</td>
                      <td>
                        <span className="badge badge-success">{appt.status}</span>
                      </td>
                      <td>
                        <button
                          onClick={() => navigate(`/patients/${appt.patientId}`)}
                          className="btn btn-secondary btn-sm"
                        >
                          View Records
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No upcoming schedules registered today.</p>
          )}
        </div>
      </div>
    );
  }

  // --- STAFF VIEW ---
  if (user.role === 'STAFF') {
    return (
      <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Hospital Coordination Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Read-only coordination of clinic appointments and directories.</p>
        </div>

        {/* Overview cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Active Bookings</h3>
            <h2 style={{ fontSize: '2rem' }}>{appointments.filter(a => a.status === 'confirmed').length}</h2>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Cancelled Bookings</h3>
            <h2 style={{ fontSize: '2rem', color: 'var(--danger)' }}>{appointments.filter(a => a.status === 'cancelled').length}</h2>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Schedule Synchronization</h3>
            <button onClick={() => navigate('/schedule')} className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem', width: '100%' }}>
              Open Coordination Schedule
            </button>
          </div>
        </div>

        {/* Quick table preview */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Live Scheduling Feed</h3>
          
          {appointments.length > 0 ? (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Department</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.slice(0, 8).map((appt) => (
                    <tr key={appt.id}>
                      <td>{appt.patient?.name}</td>
                      <td>{appt.doctorProfile?.user?.name}</td>
                      <td>{appt.doctorProfile?.specialization}</td>
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
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No appointments cataloged on the server.</p>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default Dashboard;
