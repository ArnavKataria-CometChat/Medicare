import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const ArticleManagement = ({ navigate }) => {
  const { token } = useAuth();
  const { addToast } = useToast();

  const [articles, setArticles] = useState([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      let url = '/api/admin/articles';
      const params = [];
      if (category) params.push(`category=${category}`);
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setArticles(data);
      } else {
        addToast('Failed to load articles.', 'error');
      }
    } catch (error) {
      console.error('Fetch admin articles error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchArticles();
    }
  }, [token, category]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchArticles();
  };

  const handleTogglePublish = async (articleId, currentStatus) => {
    try {
      const response = await fetch(`/api/admin/articles/${articleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ published: !currentStatus })
      });

      if (response.ok) {
        addToast(`Article ${!currentStatus ? 'published' : 'moved to drafts'} successfully.`, 'success');
        fetchArticles();
      } else {
        addToast('Failed to update article status.', 'error');
      }
    } catch (error) {
      console.error('Toggle article publish error:', error);
    }
  };

  const handleDelete = async (articleId, title) => {
    if (!window.confirm(`Are you sure you want to delete article: "${title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/articles/${articleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        addToast('Article deleted successfully.', 'success');
        fetchArticles();
      } else {
        addToast('Failed to delete article.', 'error');
      }
    } catch (error) {
      console.error('Delete article error:', error);
    }
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Health Articles <span className="gradient-text">Console</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Publish clinical insights, dietary logs, and symptom guides.</p>
        </div>
        <button onClick={() => navigate('/admin/articles/new')} className="btn btn-primary btn-sm">
          + Publish New Article
        </button>
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by title or contents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0.5rem 1rem' }}>
            Search
          </button>
        </form>

        <div className="form-group" style={{ marginBottom: 0, width: '200px' }}>
          <label className="form-label">Category</label>
          <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            <option value="diseases">Conditions & Diseases</option>
            <option value="nutrition">Nutrition & Diet</option>
            <option value="fitness">Exercise & Fitness</option>
            <option value="prevention">Preventative Care</option>
            <option value="symptoms">Symptom Guide</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Updating articles registry...</p>
        ) : articles.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Article Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Creation Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((art) => (
                  <tr key={art.id}>
                    <td style={{ fontWeight: '600', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {art.title}
                    </td>
                    <td>
                      <span className="badge badge-primary">{art.category}</span>
                    </td>
                    <td>
                      <span className={`badge ${art.published ? 'badge-success' : 'badge-warning'}`}>
                        {art.published ? 'published' : 'draft'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {new Date(art.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => navigate(`/admin/articles/${art.id}`)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleTogglePublish(art.id, art.published)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: art.published ? 'var(--warning)' : 'var(--success)' }}
                      >
                        {art.published ? 'Draft' : 'Publish'}
                      </button>
                      <button
                        onClick={() => handleDelete(art.id, art.title)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No articles found in archive.</p>
        )}
      </div>

    </div>
  );
};

export default ArticleManagement;
