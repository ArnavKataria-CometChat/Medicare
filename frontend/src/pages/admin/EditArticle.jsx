import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const EditArticle = ({ navigate, articleId }) => {
  const { token } = useAuth();
  const { addToast } = useToast();

  const isEdit = !!articleId;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('diseases');
  const [content, setContent] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [prevention, setPrevention] = useState('');
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && token) {
      const fetchArticleData = async () => {
        try {
          const response = await fetch(`/api/admin/articles`);
          if (response.ok) {
            const data = await response.json();
            const art = data.find((a) => a.id === articleId);
            if (art) {
              setTitle(art.title || '');
              setCategory(art.category || 'diseases');
              setContent(art.content || '');
              setSymptoms(art.symptoms || '');
              setPrevention(art.prevention || '');
              setPublished(art.published ?? false);
            }
          }
        } catch (error) {
          console.error('Fetch admin article edit data error:', error);
        }
      };
      fetchArticleData();
    }
  }, [isEdit, articleId, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !content) {
      addToast('Please enter a title and content body.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const url = isEdit ? `/api/admin/articles/${articleId}` : '/api/admin/articles';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          category,
          content,
          symptoms,
          prevention,
          published
        })
      });

      if (response.ok) {
        addToast(`Article ${isEdit ? 'updated' : 'published'} successfully!`, 'success');
        navigate('/admin/articles');
      } else {
        const data = await response.json();
        addToast(data.error || 'Failed to save article.', 'error');
      }
    } catch (error) {
      console.error('Save article error:', error);
      addToast('Connection failure during article save.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade" style={{ maxWidth: '850px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/admin/articles" onClick={(e) => { e.preventDefault(); navigate('/admin/articles'); }} style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          ← Back to Library Console
        </a>
      </div>

      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
          {isEdit ? 'Modify' : 'Compose'} <span className="gradient-text">Health Library Post</span>
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="form-group">
            <label className="form-label">Article Title *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Preventing Cardiovascular Disease: Core Habits"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category *</label>
            <select
              className="form-control"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              disabled={loading}
            >
              <option value="diseases">Conditions & Diseases</option>
              <option value="nutrition">Nutrition & Diet</option>
              <option value="fitness">Exercise & Fitness</option>
              <option value="prevention">Preventative Care</option>
              <option value="symptoms">Symptom Guide</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Article Body Content (Markdown supported) *</label>
            <textarea
              className="form-control"
              rows={12}
              placeholder="Write detailed medical contents..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              disabled={loading}
              style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Symptom Notes (Comma-separated keywords)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. chest pain, shortness of breath"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Prevention Tips</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. low salt diet, aerobic conditioning"
              value={prevention}
              onChange={(e) => setPrevention(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Publish Status</label>
            <select
              className="form-control"
              value={published ? 'true' : 'false'}
              onChange={(e) => setPublished(e.target.value === 'true')}
              disabled={loading}
            >
              <option value="false">Save as Draft (Private)</option>
              <option value="true">Publish Live (Visible on Site)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Saving post...' : `${isEdit ? 'Update' : 'Publish'} Health Post`}
          </button>

        </form>
      </div>

    </div>
  );
};

export default EditArticle;
