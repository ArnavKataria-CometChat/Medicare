import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const PatientRecords = ({ navigate, patientId }) => {
  const { token } = useAuth();
  const { addToast } = useToast();
  
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatientRecords = async () => {
      setLoading(true);
      try {
        // Fetch patient list to find metadata/name of patient
        const profResponse = await fetch('/api/appointments', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profResponse.ok) {
          const appts = await profResponse.json();
          const apptMatch = appts.find(a => a.patientId === patientId);
          if (apptMatch) {
            setPatient(apptMatch.patient);
          }
        }

        // Fetch records of patient
        const response = await fetch(`/api/records/patient/${patientId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setRecords(data);
        } else {
          const data = await response.json();
          addToast(data.error || 'Access denied to these records.', 'error');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Fetch patient records error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token && patientId) {
      fetchPatientRecords();
    }
  }, [token, patientId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Retrieving patient health records...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div>
        <a href="/dashboard" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }} style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          ← Back to Dashboard
        </a>
      </div>

      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          Patient Health Record Vault
        </h2>
        {patient ? (
          <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-glass)', fontSize: '0.95rem' }}>
            <p><strong>Patient Name:</strong> {patient.name}</p>
            <p><strong>Email Address:</strong> {patient.email}</p>
            <p><strong>Contact Phone:</strong> {patient.phone || 'Not provided'}</p>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>Patient ID: {patientId}</p>
        )}

        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Uploaded Clinical Files</h3>
        {records.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {records.map((rec) => (
              <div
                key={rec.id}
                className="glass-card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  background: 'var(--bg-glass)'
                }}
              >
                <div>
                  <h4 style={{ fontSize: '1rem', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }} title={rec.fileName}>
                    📄 {rec.fileName}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Uploaded: {new Date(rec.uploadedAt).toLocaleDateString()}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Format: {rec.fileType}</p>
                </div>
                <a
                  href={rec.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', marginTop: 'auto', textAlign: 'center' }}
                >
                  Download / View File
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
            This patient has not uploaded any health reports or files.
          </p>
        )}
      </div>
    </div>
  );
};

export default PatientRecords;
