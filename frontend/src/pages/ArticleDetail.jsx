import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';

const renderInlineText = (text) => {
  const parts = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(<strong key={match.index}>{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

const renderMarkdown = (content) => {
  if (!content) return null;
  
  const lines = content.split('\n');
  const elements = [];
  let listItems = [];
  
  const flushList = (key) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} style={{ paddingLeft: '1.5rem', margin: '0.5rem 0 1rem 0', listStyleType: 'disc' }}>
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    
    // Handle headers
    if (trimmed.startsWith('####')) {
      flushList(idx);
      elements.push(
        <h4 key={idx} style={{ fontSize: '1.25rem', marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: '600' }}>
          {trimmed.replace(/^####\s*/, '').trim()}
        </h4>
      );
    } else if (trimmed.startsWith('###')) {
      flushList(idx);
      elements.push(
        <h3 key={idx} style={{ fontSize: '1.5rem', marginTop: '1.75rem', marginBottom: '0.75rem', color: 'var(--text-primary)', fontWeight: '600' }}>
          {trimmed.replace(/^###\s*/, '').trim()}
        </h3>
      );
    } 
    // Handle list items
    else if (trimmed.match(/^[-*]\s/)) {
      const text = trimmed.replace(/^[-*]\s*/, '').trim();
      listItems.push(
        <li key={idx} style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
          {renderInlineText(text)}
        </li>
      );
    } else if (trimmed.match(/^\d+\.\s/)) {
      flushList(idx);
      const text = trimmed.replace(/^\d+\.\s*/, '').trim();
      elements.push(
        <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', paddingLeft: '0.5rem', color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{trimmed.match(/^\d+\./)[0]}</span>
          <span>{renderInlineText(text)}</span>
        </div>
      );
    } 
    // Handle empty lines
    else if (!trimmed) {
      flushList(idx);
      elements.push(<div key={idx} style={{ height: '0.5rem' }} />);
    } 
    // Handle regular paragraphs
    else {
      flushList(idx);
      elements.push(
        <p key={idx} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
          {renderInlineText(trimmed)}
        </p>
      );
    }
  });
  
  flushList('end');
  
  return elements;
};

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
            color: 'var(--text-primary)'
          }}
        >
          {renderMarkdown(article.content)}
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
