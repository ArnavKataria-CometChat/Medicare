import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCometChat } from '../cometchat/CometChatProvider';
import { CometChat } from '@cometchat/chat-sdk-javascript';

const AIAssistant = ({ navigate }) => {
  const { token } = useAuth();
  const { isReady } = useCometChat();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
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

  // Load message history from CometChat on panel open
  useEffect(() => {
    if (!isOpen || !isReady) return;

    const messagesRequest = new CometChat.MessagesRequestBuilder()
      .setUID('medicare_ai_assistant')
      .setLimit(50)
      .build();

    messagesRequest.fetchPrevious()
      .then((ccMessages) => {
        const formatted = ccMessages
          .filter(m => m.category === 'message' && m.type === 'text')
          .map(m => ({
            id: m.id || m.getId(),
            sender: m.getSender().getUid() === 'medicare_ai_assistant' ? 'bot' : 'user',
            text: m.getText(),
            action: m.getMetadata()?.suggestedAction,
            params: m.getMetadata()?.suggestedParams
          }));

        if (formatted.length === 0) {
          setMessages([
            {
              id: 'welcome',
              sender: 'bot',
              text: "Hello! I am your MediCare AI Assistant. How can I help you today? You can describe symptoms, ask for specialties, or say 'book with a cardiologist' to start a booking!"
            }
          ]);
        } else {
          setMessages(formatted);
        }
      })
      .catch(err => {
        console.error('[AIAssistant] Error fetching previous messages:', err);
      });

    // Register message listener for real-time bot responses
    const listenerId = `ai_assistant_listener_${Date.now()}`;
    CometChat.addMessageListener(
      listenerId,
      new CometChat.MessageListener({
        onTextMessageReceived: (textMessage) => {
          if (textMessage.getSender().getUid() === 'medicare_ai_assistant') {
            setMessages((prev) => {
              if (prev.some(m => m.id === textMessage.getId())) return prev;
              return [
                ...prev,
                {
                  id: textMessage.getId(),
                  sender: 'bot',
                  text: textMessage.getText(),
                  action: textMessage.getMetadata()?.suggestedAction,
                  params: textMessage.getMetadata()?.suggestedParams
                }
              ];
            });
          }
        }
      })
    );

    return () => {
      CometChat.removeMessageListener(listenerId);
    };
  }, [isOpen, isReady]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending || !isReady) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    try {
      // 1. Send user message to CometChat so it is logged in history
      const textMessage = new CometChat.TextMessage('medicare_ai_assistant', userMessage, CometChat.RECEIVER_TYPE.USER);
      const sentMessage = await CometChat.sendMessage(textMessage);
      
      setMessages((prev) => [
        ...prev,
        {
          id: sentMessage.getId(),
          sender: 'user',
          text: userMessage
        }
      ]);

      // 2. Call local backend endpoint to trigger AI logic and response transmission
      await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage })
      });
    } catch (error) {
      console.error('[AIAssistant] Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: 'error_' + Date.now(),
          sender: 'bot',
          text: 'Failed to send message. Please check your connection.'
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleActionClick = (action, params) => {
    setIsOpen(false);
    if (action === 'REDIRECT_BOOK') {
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
              placeholder={isReady ? "Ask anything..." : "Connecting to chat..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending || !isReady}
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
            <button type="submit" className="btn btn-primary" disabled={sending || !isReady} style={{ padding: '0.5rem 1rem' }}>
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
