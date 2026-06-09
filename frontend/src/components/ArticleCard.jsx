import React from 'react';

const ArticleCard = ({ article, onClick }) => {
  const dateStr = new Date(article.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const getCategoryTheme = (categoryStr) => {
    const lower = (categoryStr || '').toLowerCase().trim();
    switch (lower) {
      case 'diseases':
      case 'disease':
        return { bg: '#ffe4e6', color: '#e11d48', emoji: '🦠' };
      case 'nutrition':
        return { bg: '#d1fae5', color: '#059669', emoji: '🍎' };
      case 'fitness':
        return { bg: '#dbeafe', color: '#2563eb', emoji: '💪' };
      case 'prevention':
        return { bg: '#fef3c7', color: '#d97706', emoji: '🛡️' };
      case 'symptoms':
      case 'symptom':
        return { bg: '#f3e8ff', color: '#7c3aed', emoji: '🤕' };
      default:
        return { bg: '#f1f5f9', color: '#475569', emoji: '📄' };
    }
  };

  const theme = getCategoryTheme(article.category);

  return (
    <div
      className="glass-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1.75rem',
        cursor: 'pointer',
        minHeight: '260px'
      }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Emoji paired with pill badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '1.25rem', lineHeight: '1' }}>{theme.emoji}</span>
          <span
            style={{
              display: 'inline-flex',
              padding: '0.25rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              fontWeight: '700',
              backgroundColor: theme.bg,
              color: theme.color,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            {article.category}
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dateStr}</span>
      </div>
      
      <h3 style={{ fontSize: '1.1rem', fontWeight: '600', lineHeight: '1.4', margin: 0, color: 'var(--text-primary)' }}>
        {article.title}
      </h3>
      
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', flex: 1, margin: 0, lineHeight: '1.5' }}>
        {article.content ? `${article.content.substring(0, 105).replace(/[#*`_-]/g, '')}...` : ''}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Read Article →
        </span>
      </div>
    </div>
  );
};

export default ArticleCard;
