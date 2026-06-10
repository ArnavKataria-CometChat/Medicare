import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeUserToPush, isPushSupported, isPushPermissionGranted, getExistingSubscription } from '../utils/pushHelper';

const NotificationBell = () => {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported] = useState(isPushSupported());
  const panelRef = useRef(null);
  const bellRef = useRef(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        bellRef.current && !bellRef.current.contains(e.target)
      ) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check push subscription state
  useEffect(() => {
    const checkPush = async () => {
      if (isPushPermissionGranted()) {
        const sub = await getExistingSubscription();
        setPushEnabled(!!sub);
      }
    };
    checkPush();
  }, []);

  // Fetch user's notifications
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch on mount and periodically
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleBellClick = () => {
    setPanelOpen(!panelOpen);
    if (!panelOpen) {
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const handleEnablePush = async () => {
    // This is called from a click handler — so the user gesture requirement is satisfied
    const result = await subscribeUserToPush(token);
    if (result?.success) {
      setPushEnabled(true);
    }
  };

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const getEventIcon = (event) => {
    switch (event) {
      case 'APPOINTMENT_BOOKED': return '📅';
      case 'APPOINTMENT_CANCELLED': return '❌';
      case 'ACCOUNT_DEACTIVATED': return '🔒';
      case 'ARTICLE_PUBLISHED': return '📰';
      case 'RECORD_UPLOADED': return '📁';
      default: return '🔔';
    }
  };

  const getEventLabel = (event) => {
    switch (event) {
      case 'APPOINTMENT_BOOKED': return 'Appointment Confirmed';
      case 'APPOINTMENT_CANCELLED': return 'Appointment Cancelled';
      case 'ACCOUNT_DEACTIVATED': return 'Account Update';
      case 'ARTICLE_PUBLISHED': return 'New Article';
      case 'RECORD_UPLOADED': return 'Record Uploaded';
      default: return 'Notification';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={handleBellClick}
        id="notification-bell"
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: panelOpen ? 'var(--primary-glow)' : 'transparent',
          border: '1px solid var(--border-glass)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all var(--transition-fast)',
          color: 'var(--text-secondary)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary)';
          e.currentTarget.style.color = 'var(--primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-glass)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
        title="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: unreadCount > 9 ? '20px' : '16px',
              height: '16px',
              borderRadius: '10px',
              background: 'var(--danger)',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              border: '2px solid var(--bg-secondary)',
              animation: 'pulse-badge 2s infinite'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {panelOpen && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            right: 0,
            top: '48px',
            width: '380px',
            maxHeight: '520px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.12), 0 8px 20px rgba(15, 23, 42, 0.06)',
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeInPanel 0.2s ease-out'
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border-glass)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-primary)',
              flexShrink: 0
            }}
          >
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                Notifications
              </h4>
              {unreadCount > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    color: 'var(--primary)',
                    fontWeight: '600',
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'background var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-glow)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Push Permission Banner */}
          {pushSupported && !pushEnabled && (
            <div
              style={{
                padding: '0.75rem 1.25rem',
                background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.06), rgba(45, 212, 191, 0.06))',
                borderBottom: '1px solid var(--border-glass)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexShrink: 0
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🔔</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                  Enable push notifications
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                  Get instant alerts for appointments & updates
                </p>
              </div>
              <button
                onClick={handleEnablePush}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  transition: 'background var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
              >
                Enable
              </button>
            </div>
          )}

          {/* Notification List */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: '100px' }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '0.85rem' }}>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>🔕</div>
                <p style={{ fontSize: '0.85rem', fontWeight: '500' }}>No notifications yet</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  You'll receive alerts for appointments, health articles, and more.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                let message = '';
                try {
                  const parsed = JSON.parse(notif.payload);
                  message = parsed.message || '';
                } catch {
                  message = notif.payload || '';
                }

                return (
                  <div
                    key={notif.id}
                    style={{
                      padding: '0.9rem 1.25rem',
                      borderBottom: '1px solid var(--border-glass)',
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'flex-start',
                      background: notif.isRead ? 'transparent' : 'rgba(13, 148, 136, 0.03)',
                      transition: 'background var(--transition-fast)',
                      cursor: 'default'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-glow)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(13, 148, 136, 0.03)'}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'var(--bg-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '1rem',
                      border: '1px solid var(--border-glass)'
                    }}>
                      {getEventIcon(notif.event)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          color: notif.isRead ? 'var(--text-secondary)' : 'var(--text-primary)'
                        }}>
                          {getEventLabel(notif.event)}
                        </span>
                        {!notif.isRead && (
                          <span style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            flexShrink: 0
                          }} />
                        )}
                      </div>
                      <p style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        margin: 0,
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {message}
                      </p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                        {getTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Inline keyframe styles */}
      <style>{`
        @keyframes pulse-badge {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes fadeInPanel {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
