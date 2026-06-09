import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const NotificationLog = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/admin/notifications?limit=50', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs);
        }
      } catch (error) {
        console.error('Fetch notification logs error:', error);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchLogs();
  }, [token]);

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem' }}>Alert <span className="gradient-text">Notification Logs</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>Status logs for all push notification events triggered by backend APIs.</p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading alerts...</p>
        ) : logs.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Recipient Name</th>
                  <th>Recipient Email</th>
                  <th>Alert Event</th>
                  <th>Message Body</th>
                  <th>Delivery Status</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  let payloadText = '';
                  try {
                    const parsed = JSON.parse(log.payload);
                    payloadText = parsed.message || '';
                  } catch (e) {
                    payloadText = log.payload || '';
                  }

                  return (
                    <tr key={log.id}>
                      <td style={{ fontWeight: '600' }}>{log.user?.name || 'Unknown'}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{log.user?.email}</td>
                      <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{log.event}</td>
                      <td>{payloadText}</td>
                      <td>
                        <span className={`badge ${log.status === 'delivered' ? 'badge-success' : 'badge-danger'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No notifications dispatched.</p>
        )}
      </div>
    </div>
  );
};

export default NotificationLog;
