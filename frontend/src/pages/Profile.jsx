import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Profile = ({ navigate }) => {
  const { user, token, login } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [password, setPassword] = useState('');
  
  // Doctor Profile state
  const [bio, setBio] = useState('');
  const [availabilityHours, setAvailabilityHours] = useState('');
  
  const [specialization, setSpecialization] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);

  // Patient Health Records state
  const [records, setRecords] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const isDoctor = user?.role === 'DOCTOR';
  const isPatient = user?.role === 'PATIENT';

  const fetchRecordsAndProfile = async () => {
    try {
      const response = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const profileData = await response.json();
        setName(profileData.name || '');
        setPhone(profileData.phone || '');
        
        if (profileData.doctorProfile) {
          setBio(profileData.doctorProfile.bio || '');
          setAvailabilityHours(profileData.doctorProfile.availabilityHours || '');
          
          setSpecialization(profileData.doctorProfile.specialization || '');
          setExperienceYears(profileData.doctorProfile.experienceYears || 0);
        }
      }

      if (isPatient) {
        const recResponse = await fetch('/api/records', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (recResponse.ok) {
          const recData = await recResponse.json();
          setRecords(recData);
        }
      }
    } catch (error) {
      console.error('Error fetching profile records:', error);
    }
  };

  useEffect(() => {
    if (token && user) {
      fetchRecordsAndProfile();
    }
  }, [token, user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);

    const body = { name, phone };
    if (password) body.password = password;

    if (isDoctor) {
      body.bio = bio;
      body.availabilityHours = availabilityHours;
      
      body.specialization = specialization;
      body.experienceYears = parseInt(experienceYears);
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        addToast('Profile updated successfully!', 'success');
        setPassword('');
        // Refresh Auth Context state
        login(token, data.user);
      } else {
        addToast(data.error || 'Failed to update profile.', 'error');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      addToast('Connection failure during profile update.', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      addToast('Please select a file to upload.', 'warning');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        addToast('File uploaded successfully!', 'success');
        setSelectedFile(null);
        // Reset file input
        document.getElementById('record-file-input').value = '';
        fetchRecordsAndProfile(); // Reload
      } else {
        addToast(data.error || 'Failed to upload health record.', 'error');
      }
    } catch (error) {
      console.error('File upload error:', error);
      addToast('Network error during file upload.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      const response = await fetch(`/api/records/${recordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        addToast('Record deleted.', 'info');
        fetchRecordsAndProfile();
      } else {
        addToast('Failed to delete record.', 'error');
      }
    } catch (error) {
      console.error('Delete record error:', error);
    }
  };

  return (
    <div className="animate-fade" style={{ display: 'grid', gridTemplateColumns: isPatient ? '1fr 1fr' : '1fr', gap: '2rem', flexWrap: 'wrap' }}>
      
      {/* Profile Form */}
      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
          Personal <span className="gradient-text">Profile Management</span>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name (Read-only)</label>
            <input
              type="text"
              className="form-control"
              value={name}
              disabled
              style={{ color: 'var(--text-muted)' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email (Read-only)</label>
            <input
              type="email"
              className="form-control"
              value={user?.email || ''}
              disabled
              style={{ color: 'var(--text-muted)' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number (Read-only)</label>
            <input
              type="text"
              className="form-control"
              value={phone}
              disabled
              style={{ color: 'var(--text-muted)' }}
            />
          </div>

          {/* Doctor Professional Fields */}
          {isDoctor && (
            <>
              <h3 style={{ fontSize: '1.15rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                Professional Credentials
              </h3>

              <div className="form-group">
                <label className="form-label">Specialization (Read-only)</label>
                <input
                  type="text"
                  className="form-control"
                  value={specialization}
                  disabled
                  style={{ color: 'var(--text-muted)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Years of Experience (Read-only)</label>
                <input
                  type="number"
                  className="form-control"
                  value={experienceYears}
                  disabled
                  style={{ color: 'var(--text-muted)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Weekly Availability Hours (Read-only)</label>
                <input
                  type="text"
                  className="form-control"
                  value={availabilityHours}
                  disabled
                  style={{ color: 'var(--text-muted)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Professional Biography (Read-only)</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={bio}
                  disabled
                  style={{ color: 'var(--text-muted)' }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Patient Health Records Uploads */}
      {isPatient && (
        <div className="glass-panel" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem' }}>Health Records & <span className="gradient-text">Reports</span></h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Upload your medical reports, scan PDFs, or diagnostic sheets. Connected doctors can view them.
            </p>
          </div>

          {/* File Uploader */}
          <form onSubmit={handleFileUpload} className="glass-card" style={{ padding: '1.5rem', borderStyle: 'dashed', borderWidth: '1.5px', background: 'rgba(255,255,255,0.01)' }}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Upload Medical File (PDF, Images up to 10MB)</label>
              <input
                id="record-file-input"
                type="file"
                className="form-control"
                onChange={handleFileChange}
                disabled={uploading}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }} disabled={uploading}>
              {uploading ? 'Uploading File...' : 'Upload Health Record'}
            </button>
          </form>

          {/* Uploaded List */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Uploaded Documents</h3>
            {records.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {records.map((rec) => (
                  <div
                    key={rec.id}
                    className="glass-card"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-glass)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                      <a
                        href={rec.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontWeight: '600', fontSize: '0.9rem', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                      >
                        📄 {rec.fileName}
                      </a>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Uploaded: {new Date(rec.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteRecord(rec.id)}
                      className="btn btn-danger btn-sm"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>
                No records uploaded yet.
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
