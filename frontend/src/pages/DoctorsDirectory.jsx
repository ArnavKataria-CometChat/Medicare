import React, { useEffect, useState } from 'react';
import DoctorCard from '../components/DoctorCard';
import { useToast } from '../context/ToastContext';

const DoctorsDirectory = ({ navigate, navigationState }) => {
  const { addToast } = useToast();
  const [doctors, setDoctors] = useState([]);
  const [specialization, setSpecialization] = useState(
    (navigationState && navigationState.specialization) || ''
  );
  const [loading, setLoading] = useState(true);

  const [allSpecialties, setAllSpecialties] = useState([
    'Cardiology', 'Neurology', 'Dermatology', 'Orthopedics', 'Pediatrics', 
    'General Medicine', 'Psychiatry', 'Oncology', 'Ophthalmology', 'Gastroenterology', 'Endocrinology'
  ]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      // Always fetch all doctors to build the specialties list
      const allRes = await fetch('/api/doctors');
      let allDoctors = [];
      if (allRes.ok) {
        allDoctors = await allRes.json();
        // Build dynamic specialties from actual data
        const dbSpecialties = [...new Set(allDoctors.map(d => d.specialization).filter(Boolean))].sort();
        setAllSpecialties(dbSpecialties);
      }

      // If a filter is applied, filter client-side
      if (specialization) {
        setDoctors(allDoctors.filter(d => d.specialization === specialization));
      } else {
        setDoctors(allDoctors);
      }
    } catch (error) {
      console.error('Fetch doctors error:', error);
      addToast('Connection failed when listing doctors.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [specialization]);

  const handleBook = (doctorId, specialty, doctorName) => {
    // Navigate to booking route with state
    navigate('/book', { doctorProfileId: doctorId, specialization: specialty, doctorName });
  };

  const handleViewDetails = (id) => {
    navigate(`/doctors/${id}`);
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Medical <span className="gradient-text">Directory</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Browse verified medical professionals and check availability.
          </p>
        </div>

        {/* Specialty Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Specialty:</label>
          <select
            className="form-control"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            style={{ width: '220px', borderRadius: 'var(--radius-sm)' }}
          >
            <option value="">All Specialties</option>
            {allSpecialties.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-glass)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading directory...</p>
        </div>
      ) : doctors.length > 0 ? (
        <div className="grid-list">
          {doctors.map((doc) => (
            <DoctorCard
              key={doc.id}
              doctor={doc}
              onBook={handleBook}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel animate-fade" style={{ padding: '4rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Doctors Found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            We couldn't find any active doctors specializing in "{specialization}". Try another specialty or view the entire directory.
          </p>
          <button onClick={() => setSpecialization('')} className="btn btn-primary btn-sm" style={{ marginTop: '1.5rem' }}>
            Show All Doctors
          </button>
        </div>
      )}
    </div>
  );
};

export default DoctorsDirectory;
