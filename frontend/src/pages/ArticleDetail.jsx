import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';

const ArticleDetail = ({ navigate, articleId }) => {
  const { addToast } = useToast();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await fetch(`/api/articles/${articleId}`);
        if (response.ok) {
          const data = await response.json();
          setArticle(data);
        } else {
          addToast('Could not load article.', 'error');
          navigate('/articles');
        }
      } catch (error) {
        console.error('Fetch article error:', error);
        addToast('Connection failed when downloading article details.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [articleId, navigate, addToast]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading article content...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3>Article not found</h3>
        <button onClick={() => navigate('/articles')} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Library
        </button>
      </div>
    );
  }

  const dateStr = new Date(article.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Back button */}
      <div>
        <a href="/articles" onClick={(e) => { e.preventDefault(); navigate('/articles'); }} style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          ← Back to Articles Library
        </a>
      </div>

      <div className="glass-panel" style={{ padding: '3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className="badge badge-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            {article.category}
          </span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Published: {dateStr}</span>
        </div>

        <h1 style={{ fontSize: '2.5rem', lineHeight: '1.2' }}>{article.title}</h1>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)' }} />

        {/* Content body */}
        <div
          style={{
            lineHeight: '1.8',
            fontSize: '1.1rem',
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap' // Preserves formatting from seeds
          }}
        >
          {article.content}
        </div>

        {(article.symptoms || article.prevention) && (
          <div
            style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-glass)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            {article.symptoms && (
              <div>
                <strong style={{ color: 'var(--warning)', display: 'block', marginBottom: '0.25rem' }}>🚨 Common Symptoms:</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{article.symptoms}</span>
              </div>
            )}
            {article.prevention && (
              <div>
                <strong style={{ color: 'var(--success)', display: 'block', marginBottom: '0.25rem' }}>🛡️ Prevention Tips:</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{article.prevention}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleDetail;
