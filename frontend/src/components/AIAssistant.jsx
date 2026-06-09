import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const AIAssistant = ({ navigate }) => {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I am your MediCare AI Assistant. How can I help you today? You can describe symptoms, ask for specialties, or say 'book with a cardiologist' to start a booking!"
    }
  ]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setSending(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: data.reply,
            action: data.suggestedAction,
            params: data.suggestedParams
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'bot', text: 'Sorry, I encountered an error processing that request.' }
        ]);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Connection lost. Please check if the server is running.' }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleActionClick = (action, params) => {
    setIsOpen(false);
    if (action === 'REDIRECT_BOOK') {
      // Navigate to /book and pass pre-populated info via session/state
      navigate('/book', params);
    } else if (action === 'REDIRECT_DIRECTORY') {
      navigate('/doctors');
    }
  };

  return (
    <>
      <button className="ai-assistant-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '✕' : '💬'}
      </button>

      {isOpen && (
        <div className="ai-assistant-panel glass-panel">
          <div className="ai-panel-header">
            <h3 className="ai-panel-title">
              <span></span> MediCare AI Assistant
            </h3>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', color: 'var(--text-muted)' }}>
              ✕
            </button>
          </div>

          <div className="ai-chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className="chat-bubble-container" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className={`ai-chat-bubble ${msg.sender}`}>
                  {msg.text}
                </div>
                {msg.sender === 'bot' && msg.action && (
                  <button
                    onClick={() => handleActionClick(msg.action, msg.params)}
                    className="btn btn-primary btn-sm"
                    style={{ alignSelf: 'flex-start', marginLeft: '0.5rem', marginBottom: '0.5rem' }}
                  >
                    {msg.action === 'REDIRECT_BOOK' ? `Book with ${msg.params?.doctorName || 'Doctor'}` : 'Open Doctors Directory'}
                  </button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="ai-chat-input-area">
            <input
              type="text"
              className="form-control"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
            <button type="submit" className="btn btn-primary" disabled={sending} style={{ padding: '0.5rem 1rem' }}>
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
