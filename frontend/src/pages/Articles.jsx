import React, { useEffect, useState } from 'react';
import ArticleCard from '../components/ArticleCard';
import { useToast } from '../context/ToastContext';

const Articles = ({ navigate }) => {
  const { addToast } = useToast();
  const [articles, setArticles] = useState([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const categories = [
    { value: '', label: 'All Resources' },
    { value: 'diseases', label: 'Conditions & Diseases' },
    { value: 'nutrition', label: 'Nutrition & Diet' },
    { value: 'fitness', label: 'Exercise & Fitness' },
    { value: 'prevention', label: 'Preventative Care' },
    { value: 'symptoms', label: 'Symptom Guide' }
  ];

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const url = category ? `/api/articles?category=${category}` : '/api/articles';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setArticles(data);
      } else {
        addToast('Failed to fetch articles.', 'error');
      }
    } catch (error) {
      console.error('Fetch articles error:', error);
      addToast('Connection failed when listing articles.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [category]);

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Health & Wellness <span className="gradient-text">Library</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Curated scientific education and wellness resources vetted by medical staff.
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--border-glass)',
          paddingBottom: '1rem'
        }}
      >
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`btn btn-sm ${category === cat.value ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '9999px' }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading articles library...</p>
        </div>
      ) : articles.length > 0 ? (
        <div className="grid-list">
          {articles.map((art) => (
            <ArticleCard
              key={art.id}
              article={art}
              onClick={() => navigate(`/articles/${art.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
          <h3>No Articles Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            We could not find any active articles under this category. Please choose another topic.
          </p>
        </div>
      )}
    </div>
  );
};

export default Articles;
