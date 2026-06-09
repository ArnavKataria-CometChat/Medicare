import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const EditUser = ({ navigate, userId }) => {
  const { token } = useAuth();
  const { addToast } = useToast();

  const isEdit = !!userId;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('PATIENT');
  const [status, setStatus] = useState('active');

  // Doctor Fields
  const [specialization, setSpecialization] = useState('General Medicine');
  const [experienceYears, setExperienceYears] = useState(0);
  const [bio, setBio] = useState('');
  const [availabilityHours, setAvailabilityHours] = useState('Mon-Fri 9am-5pm');
  const [imageUrl, setImageUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && token) {
      const fetchUserData = async () => {
        try {
          const response = await fetch(`/api/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setName(data.name || '');
            setEmail(data.email || '');
            setPhone(data.phone || '');
            setRole(data.role || 'PATIENT');
            setStatus(data.status || 'active');

            if (data.doctorProfile) {
              setSpecialization(data.doctorProfile.specialization || '');
              setExperienceYears(data.doctorProfile.experienceYears || 0);
              setBio(data.doctorProfile.bio || '');
              setAvailabilityHours(data.doctorProfile.availabilityHours || '');
              setImageUrl(data.doctorProfile.imageUrl || '');
              setIsAvailable(data.doctorProfile.isAvailable ?? true);
            }
          } else {
            addToast('Could not load user data.', 'error');
            navigate('/admin/users');
          }
        } catch (error) {
          console.error('Fetch edit user details error:', error);
        }
      };
      fetchUserData();
    }
  }, [isEdit, userId, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const body = {
      name,
      email,
      phone,
      role,
      status
    };

    if (password) body.password = password;

    if (role === 'DOCTOR') {
      body.specialization = specialization;
      body.experienceYears = parseInt(experienceYears);
      body.bio = bio;
      body.availabilityHours = availabilityHours;
      body.imageUrl = imageUrl;
      body.isAvailable = isAvailable;
    }

    try {
      const url = isEdit ? `/api/admin/users/${userId}` : '/api/admin/users';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        addToast(`User ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
        navigate('/admin/users');
      } else {
        const data = await response.json();
        addToast(data.error || 'Operation failed.', 'error');
      }
    } catch (error) {
      console.error('Edit user submit error:', error);
      addToast('Connection failure during save.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade" style={{ maxWidth: '700px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/admin/users" onClick={(e) => { e.preventDefault(); navigate('/admin/users'); }} style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          ← Back to User Registry
        </a>
      </div>

      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
          {isEdit ? 'Modify' : 'Register New'} <span className="gradient-text">MediCare User</span>
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password {isEdit ? '(Leave blank to keep current)' : '*'}</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEdit}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="text"
              className="form-control"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">User Access Role *</label>
            <select
              className="form-control"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading || isEdit} // Cannot change role of existing user for safety
              required
            >
              <option value="PATIENT">Patient</option>
              <option value="DOCTOR">Doctor</option>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Account Status</label>
            <select
              className="form-control"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={loading}
              required
            >
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
            </select>
          </div>

          {/* Doctor Professional Details */}
          {role === 'DOCTOR' && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Doctor Profile Settings</h3>

              <div className="form-group">
                <label className="form-label">Specialization Department *</label>
                <input
                  type="text"
                  className="form-control"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Years of Experience *</label>
                <input
                  type="number"
                  className="form-control"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Weekly Office Hours</label>
                <input
                  type="text"
                  className="form-control"
                  value={availabilityHours}
                  onChange={(e) => setAvailabilityHours(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Profile Photo URL</label>
                <input
                  type="url"
                  className="form-control"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Availability Toggles</label>
                <select
                  className="form-control"
                  value={isAvailable ? 'true' : 'false'}
                  onChange={(e) => setIsAvailable(e.target.value === 'true')}
                  disabled={loading}
                >
                  <option value="true">Online (Display in Directory)</option>
                  <option value="false">Offline (Hide from Directory)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Biography</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Saving credentials...' : `${isEdit ? 'Update' : 'Create'} User Profile`}
          </button>

        </form>
      </div>

    </div>
  );
};

export default EditUser;
