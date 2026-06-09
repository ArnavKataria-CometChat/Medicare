import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const ActivityLog = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/admin/activities?limit=50', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs);
        }
      } catch (error) {
        console.error('Fetch logs error:', error);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchLogs();
  }, [token]);

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem' }}>Audit <span className="gradient-text">Activity Logs</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>Live trace of user actions, logins, updates, and schedule bookings.</p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading audit logs...</p>
        ) : logs.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Action Type</th>
                  <th>Audit Description</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div>
                        <strong>{log.user?.name || 'Guest / System'}</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.user?.email || 'N/A'}</p>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-primary">{log.user?.role || 'SYSTEM'}</span>
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{log.activityType}</td>
                    <td>{log.description}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No audit logs archived.</p>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
