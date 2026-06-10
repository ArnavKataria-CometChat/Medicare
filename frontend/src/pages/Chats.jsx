import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const Chats = () => {
  const { user } = useAuth();

  // Pick suitable contact list depending on logged-in role
  const isDoctor = user?.role === 'DOCTOR';

  const defaultContacts = isDoctor
    ? [
        { id: '1', name: 'Arnav Kataria', role: 'PATIENT', initials: 'AK', desc: 'Patient (Mild Fatigue)', lastMsg: 'Thanks doctor, feeling better' },
        { id: '2', name: 'Ananya Kataria', role: 'CAREGIVER', initials: 'AK', desc: 'Caregiver / Family', lastMsg: 'Should we adjust the dosage?' },
        { id: '3', name: 'Jane Doe', role: 'PATIENT', initials: 'JD', desc: 'Patient (BP Check)', lastMsg: 'Telemetry logged' }
      ]
    : [
        { id: '1', name: 'Dr. Sarah Jenkins', role: 'DOCTOR', specialty: 'Cardiologist', initials: 'SJ', desc: 'Cardiology Specialist', lastMsg: 'I reviewed your ECG telemetry' },
        { id: '2', name: 'Dr. Marcus Vance', role: 'DOCTOR', specialty: 'Neurologist', initials: 'MV', desc: 'Neurology Specialist', lastMsg: 'MRI scan scheduling' },
        { id: '3', name: 'Dr. Evelyn Ross', role: 'DOCTOR', specialty: 'General Practitioner', initials: 'ER', desc: 'Primary Family Physician', lastMsg: 'Prescription renewal ready' }
      ];

  const [contacts, setContacts] = useState(defaultContacts);
  const [selectedContact, setSelectedContact] = useState(defaultContacts[0]);

  // Messages logs grouped by contact ID
  const [chats, setChats] = useState({
    '1': [
      { id: 1, sender: 'doctor', senderName: 'Dr. Sarah Jenkins', content: "Hello Arnav, I reviewed your clinical telemetry and ECG from yesterday. Everything looks normal, but I'd like to check how you are feeling.", time: '10:30 AM' },
      { id: 2, sender: 'patient', senderName: 'Arnav Kataria', content: "Thanks, Dr. Sarah. I've been feeling much better. Just some mild fatigue in the evenings.", time: '10:32 AM' }
    ],
    '2': [
      { id: 1, sender: 'caregiver', senderName: 'Ananya Kataria', content: 'Hello doctor, do you have a brief moment today to review the blood sugar levels?', time: '09:15 AM' },
      { id: 2, sender: 'doctor', senderName: 'Dr. Sarah Jenkins', content: 'Yes Ananya, please send the records here or click call to start a audio consultation.', time: '09:20 AM' }
    ],
    '3': [
      { id: 1, sender: 'doctor', senderName: 'Dr. Sarah Jenkins', content: 'Jane, please ensure you log your blood pressure values daily before breakfast.', time: 'Yesterday' }
    ]
  });

  const [textVal, setTextVal] = useState('');
  
  // Call States: 'idle' | 'ringing' | 'connected'
  const [callState, setCallState] = useState({
    status: 'idle',
    type: null,
    duration: 0
  });

  const [callSettings, setCallSettings] = useState({
    micMuted: false,
    cameraOff: false
  });

  const [soundEffects, setSoundEffects] = useState(true);

  const messagesScrollRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const ringTimeoutRef = useRef(null);

  // Scroll messages container to bottom without window shifting
  useEffect(() => {
    if (messagesScrollRef.current) {
      messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
    }
  }, [chats, selectedContact]);

  // Call duration counter and automatic connection
  useEffect(() => {
    if (callState.status === 'ringing') {
      if (soundEffects) playRingSound();
      
      // Auto-connect call after 2.5 seconds to simulate other side accepting
      ringTimeoutRef.current = setTimeout(() => {
        setCallState(prev => ({ ...prev, status: 'connected' }));
      }, 2500);
    } else if (callState.status === 'connected') {
      timerIntervalRef.current = setInterval(() => {
        setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    }

    return () => {
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [callState.status]);

  // Audio synthesis
  const playRingSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.8);
      osc2.stop(ctx.currentTime + 1.8);
    } catch (e) {}
  };

  const playHangupSound = () => {
    if (!soundEffects) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.setValueAtTime(220, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  };

  const playChime = () => {
    if (!soundEffects) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  };

  const getFormattedTime = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!textVal.trim()) return;

    const contactId = selectedContact.id;
    const currentMsgs = chats[contactId] || [];

    const newMsg = {
      id: Date.now(),
      sender: isDoctor ? 'doctor' : 'patient',
      senderName: isDoctor ? 'Dr. Sarah Jenkins' : 'Arnav Kataria',
      content: textVal.trim(),
      time: getFormattedTime()
    };

    const updatedChats = {
      ...chats,
      [contactId]: [...currentMsgs, newMsg]
    };
    
    setChats(updatedChats);
    setTextVal('');
    playChime();

    // Trigger automated reply from doctor/patient
    setTimeout(() => {
      const replyContent = isDoctor
        ? "Got it, doctor. I'll make sure to follow this. Let me know if we need a call."
        : `Thanks for the update. I have logged this in your clinical record room. Please click the video icon above if you'd like to initiate a virtual visit.`;

      const automatedMsg = {
        id: Date.now() + 1,
        sender: isDoctor ? 'patient' : 'doctor',
        senderName: selectedContact.name,
        content: replyContent,
        time: getFormattedTime()
      };

      setChats(prev => ({
        ...prev,
        [contactId]: [...(prev[contactId] || []), automatedMsg]
      }));
      playChime();
    }, 1500);
  };

  const initiateCall = (type) => {
    setCallState({
      status: 'ringing',
      type,
      duration: 0
    });
    setCallSettings({
      micMuted: false,
      cameraOff: false
    });
  };

  const terminateCall = () => {
    playHangupSound();
    
    // Log call end in chat logs
    const contactId = selectedContact.id;
    const mins = Math.floor(callState.duration / 60);
    const secs = callState.duration % 60;
    const durStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    const logMsg = {
      id: Date.now(),
      sender: 'system',
      senderName: 'System',
      content: `🎥 ${callState.type === 'video' ? 'Video' : 'Voice'} call ended • Duration: ${durStr}`,
      time: getFormattedTime()
    };

    setChats(prev => ({
      ...prev,
      [contactId]: [...(prev[contactId] || []), logMsg]
    }));

    setCallState({
      status: 'idle',
      type: null,
      duration: 0
    });
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const activeMessages = chats[selectedContact.id] || [];

  // Floating audio waves component
  const WaveformVisualizer = () => {
    return (
      <div className="call-waves-container">
        <div className="wave-bar" style={{ height: '20px', animationDelay: '0.1s' }} />
        <div className="wave-bar" style={{ height: '35px', animationDelay: '0.3s' }} />
        <div className="wave-bar" style={{ height: '50px', animationDelay: '0.5s' }} />
        <div className="wave-bar" style={{ height: '25px', animationDelay: '0.2s' }} />
        <div className="wave-bar" style={{ height: '40px', animationDelay: '0.4s' }} />
        <div className="wave-bar" style={{ height: '15px', animationDelay: '0.6s' }} />
      </div>
    );
  };

  return (
    <div className="chats-container animate-fade">
      {/* Scoped Styling override */}
      <style dangerouslySetInnerHTML={{ __html: `
        .chats-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          height: calc(100vh - 180px);
          min-height: 580px;
          border: 1px solid #cbd5e1;
          border-radius: 16px;
          background: white;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(15,23,42,0.06);
        }

        /* Contacts panel (Left) */
        .contacts-panel {
          width: 300px;
          border-right: 1px solid #cbd5e1;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
        }

        .contacts-header {
          padding: 1.25rem;
          border-bottom: 1px solid #e2e8f0;
          background: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .contacts-header h2 {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
          color: var(--text-primary);
        }

        .sound-toggle-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 1.1rem;
        }

        .contacts-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.75rem;
        }

        .contact-card {
          padding: 0.75rem 1rem;
          border-radius: 12px;
          display: flex;
          gap: 12px;
          align-items: center;
          cursor: pointer;
          margin-bottom: 0.5rem;
          transition: all 0.2s ease;
        }

        .contact-card:hover {
          background: #f1f5f9;
        }

        .contact-card.active {
          background: var(--primary-glow);
          border-left: 4px solid var(--primary);
        }

        .avatar-initials {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.95rem;
        }

        .contact-info-block {
          flex: 1;
          text-align: left;
          overflow: hidden;
        }

        .contact-name-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .contact-name-row h3 {
          font-size: 0.9rem;
          font-weight: 700;
          margin: 0;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .contact-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 2px 0 0 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .contact-last-msg {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Message board panel (Right) */
        .message-board {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: white;
          position: relative;
        }

        .board-header {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #cbd5e1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
        }

        .board-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
        }

        .board-header-name {
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
          color: var(--text-primary);
        }

        .board-header-sub {
          font-size: 0.75rem;
          color: #10b981;
          margin: 2px 0 0 0;
        }

        .board-header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .board-action-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          color: var(--text-secondary);
          transition: all 0.2s;
        }

        .board-action-btn:hover {
          background: var(--primary-glow);
          color: var(--primary);
        }

        .messages-scrollarea {
          flex: 1;
          background: #f8fafc;
          padding: 1.5rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .board-msg-row {
          display: flex;
          flex-direction: column;
        }

        .board-msg-row.sent {
          align-items: flex-end;
        }

        .board-msg-row.received {
          align-items: flex-start;
        }

        .board-msg-meta {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-bottom: 3px;
          padding: 0 4px;
        }

        .board-msg-bubble {
          padding: 0.75rem 1rem;
          border-radius: 14px;
          max-width: 70%;
          font-size: 0.875rem;
          line-height: 1.4;
          word-break: break-word;
          text-align: left;
        }

        .board-msg-row.sent .board-msg-bubble {
          background: var(--primary);
          color: white;
          border-bottom-right-radius: 2px;
          box-shadow: 0 2px 4px rgba(13,148,136,0.1);
        }

        .board-msg-row.received .board-msg-bubble {
          background: white;
          color: var(--text-primary);
          border: 1px solid #cbd5e1;
          border-bottom-left-radius: 2px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }

        .board-msg-row.system-msg {
          align-items: center;
          margin: 0.5rem 0;
        }

        .board-msg-row.system-msg .board-msg-bubble {
          background: #e2e8f0;
          color: var(--text-secondary);
          font-size: 0.75rem;
          padding: 0.35rem 0.75rem;
          border-radius: 20px;
          max-width: 90%;
        }

        .board-input-form {
          padding: 1rem 1.5rem;
          border-top: 1px solid #cbd5e1;
          display: flex;
          gap: 0.75rem;
          align-items: center;
          background: white;
        }

        .board-input-field {
          flex: 1;
          border: 1px solid #cbd5e1;
          border-radius: 24px;
          padding: 0.6rem 1.2rem;
          font-size: 0.9rem;
        }

        .board-input-field:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(13,148,136,0.12);
        }

        .board-send-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .board-send-btn:hover {
          background: var(--primary-hover);
        }

        /* --- IMMERSIVE CALLING OVERLAY --- */
        .board-call-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.96);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          padding: 4rem 2rem 2.5rem 2rem;
          color: white;
        }

        .call-top-desc {
          text-align: center;
        }

        .call-top-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 700;
          margin: 0 auto 1.25rem auto;
          box-shadow: 0 0 0 0 rgba(13,148,136,0.4);
          animation: callGlow 2s infinite;
        }

        @keyframes callGlow {
          0% { box-shadow: 0 0 0 0 rgba(13,148,136,0.6); }
          70% { box-shadow: 0 0 0 24px rgba(13,148,136,0); }
          100% { box-shadow: 0 0 0 0 rgba(13,148,136,0); }
        }

        .call-top-name {
          font-size: 1.4rem;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .call-top-status {
          font-size: 0.85rem;
          color: #2dd4bf;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-top: 6px;
        }

        .call-top-timer {
          font-size: 1.1rem;
          font-family: monospace;
          background: rgba(255,255,255,0.15);
          padding: 3px 10px;
          border-radius: 12px;
          margin-top: 8px;
          display: inline-block;
        }

        .video-stream-grid {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: #1e293b;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          z-index: -1;
        }

        .video-large-feed {
          text-align: center;
        }

        .video-large-feed svg {
          width: 80px;
          height: 80px;
          color: rgba(255,255,255,0.3);
          margin-bottom: 1rem;
          animation: float 4s ease-in-out infinite;
        }

        .pip-self-feed {
          position: absolute;
          top: 2rem;
          right: 2rem;
          width: 100px;
          height: 150px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.3);
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .pip-self-label {
          position: absolute;
          bottom: 4px;
          left: 6px;
          font-size: 0.6rem;
          background: rgba(0,0,0,0.5);
          padding: 2px 4px;
          border-radius: 2px;
        }

        .call-bottom-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          width: 100%;
        }

        .active-call-buttons {
          display: flex;
          gap: 1.5rem;
        }

        .call-control-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          transition: all 0.2s;
        }

        .call-control-circle.active {
          background: white;
          color: #0f172a;
        }

        .call-control-circle.hang-up {
          background: #ef4444;
          width: 56px;
          height: 56px;
          font-size: 1.3rem;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.45);
        }

        .call-control-circle.hang-up:hover {
          transform: scale(1.1);
        }

        .call-waves-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          height: 60px;
          margin-top: 2rem;
        }

        .wave-bar {
          width: 4px;
          background: #2dd4bf;
          border-radius: 4px;
          animation: voiceRipple 1.2s ease-in-out infinite;
        }

        @keyframes voiceRipple {
          0%, 100% { transform: scaleY(0.25); }
          50% { transform: scaleY(1); }
        }
      ` }} />

      {/* 1. LEFT COLUMN: Channel list */}
      <div className="contacts-panel">
        <div className="contacts-header">
          <h2>Room Consults</h2>
          <button
            type="button"
            className="sound-toggle-btn"
            onClick={() => setSoundEffects(!soundEffects)}
            title={soundEffects ? 'Mute chimes' : 'Enable chimes'}
          >
            {soundEffects ? '🔊' : '🔇'}
          </button>
        </div>
        <div className="contacts-list">
          {contacts.map((contact) => {
            const isActive = contact.id === selectedContact.id;
            return (
              <div
                key={contact.id}
                className={`contact-card ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedContact(contact)}
              >
                <div className="avatar-initials">{contact.initials}</div>
                <div className="contact-info-block">
                  <div className="contact-name-row">
                    <h3>{contact.name}</h3>
                  </div>
                  <p className="contact-desc">
                    {contact.specialty ? contact.specialty : contact.desc}
                  </p>
                  <p className="contact-last-msg">{contact.lastMsg}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. RIGHT COLUMN: Active Chat details and logs */}
      <div className="message-board">
        {/* Board Header */}
        <div className="board-header">
          <div className="board-header-left">
            <div className="avatar-initials">{selectedContact.initials}</div>
            <div>
              <p className="board-header-name">{selectedContact.name}</p>
              <p className="board-header-sub">
                <span className="pulsing-dot" style={{ width: '6px', height: '6px', marginRight: '6px' }}></span>
                Clinical Line Connected
              </p>
            </div>
          </div>
          
          <div className="board-header-actions">
            <button
              type="button"
              className="board-action-btn"
              title="Voice Consultation"
              onClick={() => initiateCall('voice')}
              disabled={callState.status !== 'idle'}
              style={{ opacity: callState.status === 'idle' ? 1 : 0.4 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
            <button
              type="button"
              className="board-action-btn"
              title="Video Consultation"
              onClick={() => initiateCall('video')}
              disabled={callState.status !== 'idle'}
              style={{ opacity: callState.status === 'idle' ? 1 : 0.4 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Message scroll container */}
        <div className="messages-scrollarea" ref={messagesScrollRef}>
          {activeMessages.map((msg) => {
            if (msg.sender === 'system') {
              return (
                <div key={msg.id} className="board-msg-row system-msg">
                  <div className="board-msg-bubble">{msg.content}</div>
                </div>
              );
            }
            const isSelf = isDoctor ? msg.sender === 'doctor' : msg.sender === 'patient';
            return (
              <div key={msg.id} className={`board-msg-row ${isSelf ? 'sent' : 'received'}`}>
                <div className="board-msg-meta">
                  {msg.senderName} • {msg.time}
                </div>
                <div className="board-msg-bubble">{msg.content}</div>
              </div>
            );
          })}
        </div>

        {/* Message send form */}
        <form className="board-input-form" onSubmit={handleSend}>
          <input
            type="text"
            className="board-input-field"
            placeholder={`Type clinical note or chat with ${selectedContact.name}...`}
            value={textVal}
            onChange={(e) => setTextVal(e.target.value)}
          />
          <button type="submit" className="board-send-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>

        {/* Immersive calling overlay screen */}
        {callState.status !== 'idle' && (
          <div className="board-call-overlay">
            
            {/* If Video Call is connected, draw camera screen background */}
            {callState.status === 'connected' && callState.type === 'video' && !callSettings.cameraOff && (
              <div className="video-stream-grid">
                <div className="pip-self-feed">
                  <span className="pip-self-label">Self</span>
                  <div style={{ fontSize: '1.25rem' }}>🧑</div>
                </div>
                <div className="video-large-feed">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    {selectedContact.name} (Camera Feed)
                  </div>
                  <WaveformVisualizer />
                </div>
              </div>
            )}

            {/* Top caller details */}
            <div className="call-top-desc">
              <div className="call-top-avatar">{selectedContact.initials}</div>
              <h2 className="call-top-name">{selectedContact.name}</h2>
              <div className="call-top-status">
                {callState.status === 'ringing' ? 'Connecting to Room...' : 'Connected Consultation'}
              </div>
              {callState.status === 'connected' && (
                <div className="call-top-timer">{formatDuration(callState.duration)}</div>
              )}
            </div>

            {/* If connected audio, show ripple waves in the middle */}
            {callState.status === 'connected' && callState.type === 'voice' && (
              <WaveformVisualizer />
            )}

            {/* Action buttons (Mute, camera, end) */}
            <div className="call-bottom-controls">
              {callState.status === 'connected' && (
                <div className="active-call-buttons">
                  <button
                    type="button"
                    className={`call-control-circle ${callSettings.micMuted ? 'active' : ''}`}
                    onClick={() => setCallSettings(prev => ({ ...prev, micMuted: !prev.micMuted }))}
                    title={callSettings.micMuted ? 'Unmute' : 'Mute Microphone'}
                  >
                    {callSettings.micMuted ? '🎙️' : '🎤'}
                  </button>
                  {callState.type === 'video' && (
                    <button
                      type="button"
                      className={`call-control-circle ${callSettings.cameraOff ? 'active' : ''}`}
                      onClick={() => setCallSettings(prev => ({ ...prev, cameraOff: !prev.cameraOff }))}
                      title={callSettings.cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
                    >
                      {callSettings.cameraOff ? '📹' : '📹'}
                    </button>
                  )}
                </div>
              )}

              <button type="button" className="call-control-circle hang-up" onClick={terminateCall} title="Terminate Call">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6c1 .72 2.27.34 2.87-.58l1.45-2.22c.3-.47.9-.7 1.43-.53l4.13 1.34c.6.2.98.79.98 1.43v3.52c0 .88-.72 1.6-1.6 1.6a19.88 19.88 0 0 1-17.65-17.65A1.6 1.6 0 0 1 4 4h3.52c.64 0 1.23.38 1.43.98l1.34 4.13c.17.53-.06 1.13-.53 1.43l-2.22 1.45c-.92.6-1.3 1.87-.58 2.87z" transform="rotate(135 12 12)" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chats;
