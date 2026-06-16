import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';

// In production the frontend is served from the same origin as the backend
// (behind nginx), so connect to the current origin. In dev, talk to the
// local backend directly on port 5000.
const SOCKET_URL = import.meta.env.PROD ? window.location.origin : 'http://localhost:5000';

const Chats = ({ navigate }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [textVal, setTextVal] = useState('');
  const [typing, setTyping] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('[Chat] Socket connected');
    });

    newSocket.on('connect_error', (err) => {
      console.error('[Chat] Socket connection error:', err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (message) => {
      // If it's from the currently selected contact or sent by me to them
      if (selectedContact && 
          (message.senderId === selectedContact.id || message.receiverId === selectedContact.id)) {
        setMessages(prev => [...prev, message]);
        // Mark as read since we're viewing this conversation
        if (message.senderId === selectedContact.id) {
          socket.emit('messages:read', { contactId: selectedContact.id });
        }
      }

      // Update conversations list
      setConversations(prev => {
        const contactId = message.senderId === user.id ? message.receiverId : message.senderId;
        const updated = prev.map(conv => {
          if (conv.id === contactId) {
            return {
              ...conv,
              lastMessage: {
                content: message.content,
                time: message.createdAt,
                isMine: message.senderId === user.id
              },
              unreadCount: (message.senderId !== user.id && contactId !== selectedContact?.id) 
                ? (conv.unreadCount || 0) + 1 
                : conv.unreadCount
            };
          }
          return conv;
        });
        // Sort by last message time
        updated.sort((a, b) => {
          const timeA = a.lastMessage?.time || 0;
          const timeB = b.lastMessage?.time || 0;
          return new Date(timeB) - new Date(timeA);
        });
        return updated;
      });
    };

    const handleTypingStart = ({ userId, userName }) => {
      if (selectedContact && userId === selectedContact.id) {
        setTyping(userName);
      }
    };

    const handleTypingStop = ({ userId }) => {
      if (selectedContact && userId === selectedContact.id) {
        setTyping(null);
      }
    };

    const handleOnline = ({ userId, online }) => {
      setOnlineUsers(prev => ({ ...prev, [userId]: online }));
    };

    const handleMessagesRead = ({ userId }) => {
      if (selectedContact && userId === selectedContact.id) {
        setMessages(prev => prev.map(msg => 
          msg.senderId === user.id ? { ...msg, read: true } : msg
        ));
      }
    };

    socket.on('message:received', handleMessage);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('user:online', handleOnline);
    socket.on('messages:read', handleMessagesRead);

    return () => {
      socket.off('message:received', handleMessage);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('user:online', handleOnline);
      socket.off('messages:read', handleMessagesRead);
    };
  }, [socket, selectedContact, user]);

  // Fetch contacts and conversations
  const fetchContacts = useCallback(async () => {
    if (!token) return;
    setLoadingContacts(true);
    try {
      const [contactsRes, convsRes] = await Promise.all([
        fetch('/api/chat/contacts', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/chat/conversations', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        setContacts(contactsData);
        // Query initial online status for all contacts
        if (socket) {
          contactsData.forEach(contact => {
            socket.emit('user:status', { targetUserId: contact.id }, (response) => {
              if (response) {
                setOnlineUsers(prev => ({ ...prev, [contact.id]: response.online }));
              }
            });
          });
        }
      }
      if (convsRes.ok) {
        const convsData = await convsRes.json();
        setConversations(convsData);
        // Also query online status for conversation contacts
        if (socket) {
          convsData.forEach(conv => {
            socket.emit('user:status', { targetUserId: conv.id }, (response) => {
              if (response) {
                setOnlineUsers(prev => ({ ...prev, [conv.id]: response.online }));
              }
            });
          });
        }
      }
    } catch (err) {
      console.error('[Chat] Error fetching contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  }, [token, socket]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Re-fetch contacts when window regains focus (e.g., after accepting a chat request)
  useEffect(() => {
    const handleFocus = () => { fetchContacts(); };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchContacts]);

  // Also refresh sidebar when socket receives a notification about chat acceptance
  useEffect(() => {
    if (!socket) return;
    const handleNotification = (notification) => {
      if (notification.url === '/chats') {
        fetchContacts();
      }
    };
    socket.on('notification:received', handleNotification);
    return () => { socket.off('notification:received', handleNotification); };
  }, [socket, fetchContacts]);

  // Fetch messages when selecting a contact
  const selectContact = useCallback(async (contact) => {
    setSelectedContact(contact);
    setMessages([]);
    setTyping(null);
    setLoadingMessages(true);

    // Query current online status of the selected contact
    if (socket) {
      socket.emit('user:status', { targetUserId: contact.id }, (response) => {
        if (response) {
          setOnlineUsers(prev => ({ ...prev, [contact.id]: response.online }));
        }
      });
    }

    try {
      const res = await fetch(`/api/chat/messages/${contact.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('[Chat] Error fetching messages:', err);
    } finally {
      setLoadingMessages(false);
    }

    // Mark messages as read
    if (socket) {
      socket.emit('messages:read', { contactId: contact.id });
    }

    // Clear unread count for this contact
    setConversations(prev => prev.map(conv => 
      conv.id === contact.id ? { ...conv, unreadCount: 0 } : conv
    ));
  }, [token, socket]);

  // Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typing]);

  // Send message
  const handleSend = (e) => {
    e.preventDefault();
    if (!textVal.trim() || !selectedContact || !socket) return;

    socket.emit('message:send', {
      receiverId: selectedContact.id,
      content: textVal.trim()
    }, (response) => {
      if (response.success) {
        setMessages(prev => [...prev, response.message]);
      } else {
        console.error('[Chat] Send failed:', response.error);
      }
    });

    setTextVal('');
    // Stop typing indicator
    socket.emit('typing:stop', { receiverId: selectedContact.id });
  };

  // Typing indicator
  const handleInputChange = (e) => {
    setTextVal(e.target.value);
    if (!socket || !selectedContact) return;

    socket.emit('typing:start', { receiverId: selectedContact.id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { receiverId: selectedContact.id });
    }, 1500);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.replace(/^dr\.\s+/i, '').trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Merge contacts and conversations into a unified list
  const allContacts = [...conversations];
  contacts.forEach(contact => {
    const existing = allContacts.find(c => c.id === contact.id);
    if (existing) {
      // Carry over chatEnded from contacts API
      existing.chatEnded = contact.chatEnded || false;
    } else {
      allContacts.push({ ...contact, lastMessage: null, unreadCount: 0, chatEnded: contact.chatEnded || false });
    }
  });

  return (
    <div className="chats-fullscreen">
      <style dangerouslySetInnerHTML={{ __html: `
        .chats-fullscreen {
          position: fixed;
          top: 60px;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          background: #f8fafc;
          z-index: 50;
          font-family: var(--font-primary);
        }

        .chat-sidebar {
          width: 320px;
          background: white;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .chat-sidebar-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .chat-sidebar-header h2 {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .chat-sidebar-header p {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 4px 0 0 0;
        }

        .chat-contact-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .chat-contact-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
          margin-bottom: 2px;
        }

        .chat-contact-item:hover {
          background: #f1f5f9;
        }

        .chat-contact-item.active {
          background: var(--primary-glow, #ccfbf1);
          border-left: 3px solid var(--primary);
        }

        .chat-avatar {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), #0f766e);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          flex-shrink: 0;
        }

        .chat-avatar .online-dot {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #10b981;
          border: 2px solid white;
        }

        .chat-contact-info {
          flex: 1;
          min-width: 0;
        }

        .chat-contact-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chat-contact-preview {
          font-size: 0.78rem;
          color: var(--text-muted);
          margin: 3px 0 0 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chat-contact-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .chat-contact-time {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .chat-unread-badge {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: white;
          min-width: 0;
        }

        .chat-main-header {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: white;
        }

        .chat-main-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .chat-main-header-name {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .chat-main-header-status {
          font-size: 0.75rem;
          color: #10b981;
          margin: 2px 0 0 0;
        }

        .chat-messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: #f8fafc;
        }

        .chat-msg-row {
          display: flex;
          flex-direction: column;
          max-width: 70%;
        }

        .chat-msg-row.sent {
          align-self: flex-end;
          align-items: flex-end;
        }

        .chat-msg-row.received {
          align-self: flex-start;
          align-items: flex-start;
        }

        .chat-msg-meta {
          font-size: 0.68rem;
          color: var(--text-muted);
          margin-bottom: 3px;
          padding: 0 6px;
        }

        .chat-msg-bubble {
          padding: 0.7rem 1rem;
          border-radius: 16px;
          font-size: 0.88rem;
          line-height: 1.45;
          word-break: break-word;
        }

        .chat-msg-row.sent .chat-msg-bubble {
          background: var(--primary);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .chat-msg-row.received .chat-msg-bubble {
          background: white;
          color: var(--text-primary);
          border: 1px solid #e2e8f0;
          border-bottom-left-radius: 4px;
        }

        .chat-typing-indicator {
          align-self: flex-start;
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          font-size: 0.8rem;
          color: var(--text-muted);
          font-style: italic;
        }

        .chat-msg-row.system {
          align-self: center;
          max-width: 80%;
        }

        .chat-msg-system {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.5rem 1rem;
          font-size: 0.78rem;
          color: #64748b;
          text-align: center;
          font-style: italic;
        }

        .chat-input-bar {
          padding: 1rem 1.5rem;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 0.75rem;
          align-items: center;
          background: white;
        }

        .chat-input-field {
          flex: 1;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 0.65rem 1.25rem;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
          font-family: var(--font-primary);
        }

        .chat-input-field:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(13,148,136,0.1);
        }

        .chat-send-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }

        .chat-send-btn:hover {
          background: var(--primary-hover, #0f766e);
        }

        .chat-send-btn:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }

        .chat-empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          gap: 1rem;
          padding: 2rem;
        }

        .chat-empty-state svg {
          opacity: 0.4;
        }

        .chat-empty-state h3 {
          font-size: 1.1rem;
          color: var(--text-secondary);
          margin: 0;
        }

        .chat-empty-state p {
          font-size: 0.85rem;
          max-width: 300px;
          text-align: center;
          line-height: 1.5;
        }

        .chat-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        @media (max-width: 768px) {
          .chat-sidebar {
            width: 100%;
            display: ${selectedContact ? 'none' : 'flex'};
          }
          .chat-main {
            display: ${selectedContact ? 'flex' : 'none'};
          }
        }
      `}} />

      {/* Sidebar - Contact list */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>Messages</h2>
          <p>{allContacts.length} conversation{allContacts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="chat-contact-list">
          {loadingContacts ? (
            <div className="chat-loading">Loading contacts...</div>
          ) : allContacts.length === 0 ? (
            <div className="chat-loading" style={{ flexDirection: 'column', gap: '0.5rem', textAlign: 'center', padding: '2rem 1rem' }}>
              <p>No conversations yet</p>
              <p style={{ fontSize: '0.75rem' }}>
                {user?.role === 'PATIENT' 
                  ? 'Book an appointment with a doctor to start chatting' 
                  : 'Your patients will appear here once they book appointments'}
              </p>
            </div>
          ) : (
            allContacts.map(contact => (
              <div
                key={contact.id}
                className={`chat-contact-item ${selectedContact?.id === contact.id ? 'active' : ''}`}
                onClick={() => selectContact(contact)}
              >
                <div className="chat-avatar">
                  {getInitials(contact.name)}
                  {onlineUsers[contact.id] && <div className="online-dot" />}
                </div>
                <div className="chat-contact-info">
                  <p className="chat-contact-name">{contact.name}</p>
                  <p className="chat-contact-preview">
                    {contact.lastMessage 
                      ? `${contact.lastMessage.isMine ? 'You: ' : ''}${contact.lastMessage.content}`
                      : contact.specialization || contact.role?.toLowerCase()
                    }
                  </p>
                </div>
                <div className="chat-contact-meta">
                  {contact.lastMessage?.time && (
                    <span className="chat-contact-time">{formatTime(contact.lastMessage.time)}</span>
                  )}
                  {contact.unreadCount > 0 && (
                    <div className="chat-unread-badge">{contact.unreadCount}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="chat-main">
        {!selectedContact ? (
          <div className="chat-empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h3>Select a conversation</h3>
            <p>Choose a contact from the sidebar to start messaging. Messages are delivered in real-time across all your devices.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="chat-main-header">
              <div className="chat-main-header-left">
                <div className="chat-avatar" style={{ width: 38, height: 38, fontSize: '0.8rem' }}>
                  {getInitials(selectedContact.name)}
                  {onlineUsers[selectedContact.id] && <div className="online-dot" />}
                </div>
                <div>
                  <p className="chat-main-header-name">{selectedContact.name}</p>
                  <p className="chat-main-header-status" style={{ color: onlineUsers[selectedContact.id] ? '#10b981' : '#94a3b8' }}>
                    {onlineUsers[selectedContact.id] ? '● Online' : '○ Offline'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {/* Voice Call Button */}
                <button
                  type="button"
                  onClick={() => alert('Voice call feature coming soon in Step 2')}
                  style={{
                    width: 38, height: 38, borderRadius: '50%', border: 'none',
                    background: '#f1f5f9', color: '#334155', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  title="Voice Call"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </button>
                {/* Video Call Button */}
                <button
                  type="button"
                  onClick={() => alert('Video call feature coming soon in Step 2')}
                  style={{
                    width: 38, height: 38, borderRadius: '50%', border: 'none',
                    background: '#f1f5f9', color: '#334155', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  title="Video Call"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M23 7l-7 5 7 5V7z" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </button>
                {/* Mobile back button */}
                <button 
                  onClick={() => setSelectedContact(null)}
                  style={{ 
                    display: 'none', 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--primary)', 
                    fontSize: '0.85rem', 
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                  className="chat-back-btn"
                >
                  ← Back
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages-area">
              {loadingMessages ? (
                <div className="chat-loading">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="chat-empty-state" style={{ opacity: 0.6 }}>
                  <p>No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`chat-msg-row ${msg.messageType === 'system' ? 'system' : (msg.senderId === user.id ? 'sent' : 'received')}`}
                  >
                    {msg.messageType === 'system' ? (
                      <div className="chat-msg-system">{msg.content}</div>
                    ) : (
                      <>
                        <div className="chat-msg-meta">
                          {msg.sender?.name || (msg.senderId === user.id ? user.name : selectedContact.name)} • {formatTime(msg.createdAt)}
                        </div>
                        <div className="chat-msg-bubble">{msg.content}</div>
                      </>
                    )}
                  </div>
                ))
              )}
              {typing && (
                <div className="chat-typing-indicator">
                  {typing} is typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {selectedContact.chatEnded ? (
              <div className="chat-input-bar" style={{ justifyContent: 'center', background: '#f1f5f9' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>This chat has ended — appointment was cancelled</span>
              </div>
            ) : (
              <form className="chat-input-bar" onSubmit={handleSend}>
                <input
                  type="text"
                  className="chat-input-field"
                  placeholder={`Message ${selectedContact.name}...`}
                  value={textVal}
                  onChange={handleInputChange}
                  autoFocus
                />
                <button 
                  type="submit" 
                  className="chat-send-btn"
                  disabled={!textVal.trim()}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Chats;
