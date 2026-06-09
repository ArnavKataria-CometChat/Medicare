import React, { useEffect, useState } from 'react';
import ArticleCard from '../components/ArticleCard';

const Home = ({ navigate }) => {
  const [featuredArticles, setFeaturedArticles] = useState([]);

  useEffect(() => {
    // Load latest 3 articles
    fetch('/api/articles')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setFeaturedArticles(data.slice(0, 3)))
      .catch((err) => console.error(err));
  }, []);

  const specialties = [
    { name: 'Cardiology', icon: '❤️' },
    { name: 'Neurology', icon: '🧠' },
    { name: 'Dermatology', icon: '✨' },
    { name: 'Orthopedics', icon: '🦴' },
    { name: 'Pediatrics', icon: '👶' },
    { name: 'General Medicine', icon: '🩺' }
  ];

  const handleNavClick = (path, state = null) => {
    navigate(path, state);
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '5rem' }}>
      
      {/* Hero Section */}
      <section className="hero-section" style={{ flexDirection: 'column', padding: '5rem 4rem 3.5rem 4rem', gap: '4rem' }}>
        <div style={{ display: 'flex', width: '100%', gap: '4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="hero-text">
            <h1 className="hero-title" style={{ fontSize: '3rem', margin: 0 }}>
              Your Health, <br />
              <span style={{ color: 'var(--accent)' }}>Fully Managed.</span>
            </h1>
            <p className="hero-subtitle">
              Welcome to MediCare. Connect with verified medical professionals, schedule physical or virtual visits, upload records safely, and consult our smart AI assistant 24/7.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button onClick={() => handleNavClick('/doctors')} className="btn btn-white">
                Find a Doctor
              </button>
              <button onClick={() => handleNavClick('/register')} className="btn btn-outline-white">
                Register as Patient
              </button>
            </div>
          </div>
          <div className="hero-image">
            <img
              src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=600"
              alt="Virtual Consultation Illustration"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=600';
              }}
            />
          </div>
        </div>

        {/* Stats Ribbon at the bottom of the Hero banner */}
        <div
          style={{
            width: '100%',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '2.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '2rem',
            textAlign: 'center'
          }}
        >
          <div>
            <h3 style={{ fontSize: '2.25rem', color: 'var(--accent)', fontWeight: '300', margin: 0 }}>30+</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '0.35rem', fontWeight: '400' }}>Verified Specialists</p>
          </div>
          <div>
            <h3 style={{ fontSize: '2.25rem', color: 'var(--accent)', fontWeight: '300', margin: 0 }}>100%</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '0.35rem', fontWeight: '400' }}>HIPAA Compliant</p>
          </div>
          <div>
            <h3 style={{ fontSize: '2.25rem', color: 'var(--accent)', fontWeight: '300', margin: 0 }}>24/7</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '0.35rem', fontWeight: '400' }}>AI Consultation</p>
          </div>
          <div>
            <h3 style={{ fontSize: '2.25rem', color: 'var(--accent)', fontWeight: '300', margin: 0 }}>10k+</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '0.35rem', fontWeight: '400' }}>Happy Patients</p>
          </div>
        </div>
      </section>

      {/* Specialties Directory Section */}
      <section>
        <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '2.5rem', fontSize: '1.65rem' }}>
          Explore Our <span className="gradient-text" style={{ fontWeight: '400' }}>Specialties</span>
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '1.5rem'
          }}
        >
          {specialties.map((spec) => (
            <div
              key={spec.name}
              className="glass-card"
              onClick={() => handleNavClick('/doctors', { specialization: spec.name })}
              style={{
                padding: '2rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem'
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'var(--primary-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem'
                }}
              >
                {spec.icon}
              </div>
              <h4 className="label-tracking" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0 }}>{spec.name}</h4>
            </div>
          ))}
        </div>
      </section>

      {/* Wellness & Health Articles Preview */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="section-title" style={{ fontSize: '1.65rem', margin: 0 }}>
            Wellness & Prevention <span className="gradient-text" style={{ fontWeight: '400' }}>Articles</span>
          </h2>
          <button onClick={() => handleNavClick('/articles')} className="btn btn-secondary btn-sm">
            View Library →
          </button>
        </div>

        {featuredArticles.length > 0 ? (
          <div className="grid-list">
            {featuredArticles.map((art) => (
              <ArticleCard
                key={art.id}
                article={art}
                onClick={() => handleNavClick(`/articles/${art.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No articles published yet. Check back soon!
          </div>
        )}
      </section>

    </div>
  );
};

export default Home;
