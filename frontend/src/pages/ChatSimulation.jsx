import React, { useState, useEffect, useRef } from 'react';

const ChatSimulation = () => {
  // Shared chat logs simulating a group consultation channel
  const [messages, setMessages] = useState([
    { id: 1, sender: 'web', senderName: 'Dr. Sarah Jenkins', role: 'DOCTOR', text: "Hello Arnav, I reviewed your clinical data and ECG telemetry from yesterday. Everything looks normal, but I'd like to check how you are feeling today.", timestamp: '10:30 AM' },
    { id: 2, sender: 'ios', senderName: 'Arnav Kataria', role: 'PATIENT', text: "Thanks, Dr. Sarah! I've been feeling much better. Just some mild fatigue in the evenings.", timestamp: '10:32 AM' },
    { id: 3, sender: 'android', senderName: 'Ananya Kataria', role: 'CAREGIVER', text: "Hello doctor, I am monitoring his diet and water intake closely. Should we adjust his evening dosage if the fatigue persists?", timestamp: '10:35 AM' }
  ]);

  // Unified call state
  // status: 'idle' | 'ringing' | 'connected'
  // type: 'voice' | 'video'
  const [call, setCall] = useState({
    status: 'idle',
    type: null,
    sender: null,
    receiver: null,
    duration: 0
  });

  // Mute / Cam Toggles during active call
  const [callSettings, setCallSettings] = useState({
    micMuted: false,
    cameraOff: false,
    speakerOn: true
  });

  // Sound FX toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Inputs for each device
  const [inputs, setInputs] = useState({
    web: '',
    ios: '',
    android: ''
  });

  const timerRef = useRef(null);
  const ringIntervalRef = useRef(null);
  const messagesEndRefs = {
    web: useRef(null),
    ios: useRef(null),
    android: useRef(null)
  };

  // Scroll messages to bottom on update
  useEffect(() => {
    Object.values(messagesEndRefs).forEach(ref => {
      if (ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }, [messages]);

  // Ringtone synthesizer trigger
  useEffect(() => {
    if (call.status === 'ringing') {
      if (soundEnabled) {
        playRingSound();
        ringIntervalRef.current = setInterval(playRingSound, 4000);
      }
    } else {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    }

    return () => {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    };
  }, [call.status, soundEnabled]);

  // Call duration counter
  useEffect(() => {
    if (call.status === 'connected') {
      timerRef.current = setInterval(() => {
        setCall(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [call.status]);

  // Audio synthesis helpers
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

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.8);
      osc2.stop(ctx.currentTime + 1.8);
    } catch (e) {
      console.log('Web Audio disabled or not allowed:', e);
    }
  };

  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  };

  const playHangupSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(330, ctx.currentTime);
      osc.frequency.setValueAtTime(220, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(165, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  };

  // Format timestamp
  const getFormattedTime = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 12 instead of 0
    return `${hours}:${minutes} ${ampm}`;
  };

  const handleSendMessage = (device, text) => {
    if (!text.trim()) return;

    const senderNames = {
      web: 'Dr. Sarah Jenkins',
      ios: 'Arnav Kataria',
      android: 'Ananya Kataria'
    };

    const senderRoles = {
      web: 'DOCTOR',
      ios: 'PATIENT',
      android: 'CAREGIVER'
    };

    const newMsg = {
      id: Date.now(),
      sender: device,
      senderName: senderNames[device],
      role: senderRoles[device],
      text: text.trim(),
      timestamp: getFormattedTime()
    };

    setMessages(prev => [...prev, newMsg]);
    setInputs(prev => ({ ...prev, [device]: '' }));
    playChime();
  };

  // Call management
  const startCall = (sender, receiver, type) => {
    if (call.status !== 'idle') return;
    setCall({
      status: 'ringing',
      type,
      sender,
      receiver,
      duration: 0
    });
    setCallSettings({
      micMuted: false,
      cameraOff: false,
      speakerOn: true
    });
  };

  const acceptCall = () => {
    setCall(prev => ({ ...prev, status: 'connected' }));
  };

  const declineCall = () => {
    playHangupSound();
    setCall({
      status: 'idle',
      type: null,
      sender: null,
      receiver: null,
      duration: 0
    });
  };

  const endActiveCall = () => {
    playHangupSound();
    
    // Add call log to messages
    const formattedDuration = formatCallDuration(call.duration);
    const systemText = `🎥 ${call.type === 'video' ? 'Video' : 'Voice'} call ended • Duration: ${formattedDuration}`;
    
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'system',
      senderName: 'System',
      role: 'SYSTEM',
      text: systemText,
      timestamp: getFormattedTime()
    }]);

    setCall({
      status: 'idle',
      type: null,
      sender: null,
      receiver: null,
      duration: 0
    });
  };

  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDeviceLabel = (deviceKey) => {
    if (deviceKey === 'web') return 'Web App (Doctor)';
    if (deviceKey === 'ios') return 'iOS App (Patient)';
    if (deviceKey === 'android') return 'Android App (Caregiver)';
    return '';
  };

  const getDeviceName = (deviceKey) => {
    if (deviceKey === 'web') return 'Dr. Sarah Jenkins';
    if (deviceKey === 'ios') return 'Arnav Kataria';
    if (deviceKey === 'android') return 'Ananya Kataria';
    return '';
  };

  // Animated visualizer bars
  const Visualizer = () => {
    const bars = Array.from({ length: 18 });
    return (
      <div className="audio-visualizer">
        {bars.map((_, i) => {
          const height = Math.floor(Math.random() * 32) + 6;
          const animDelay = `${i * 0.07}s`;
          return (
            <div
              key={i}
              className="visualizer-bar"
              style={{
                height: `${height}px`,
                animationDelay: animDelay,
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="simulation-page animate-fade">
      {/* Scope-level injected styles to prevent standard template overlaps */}
      <style dangerouslySetInnerHTML={{ __html: `
        .simulation-page {
          max-width: 1350px;
          margin: 0 auto;
          padding: 1rem 0 3rem 0;
          font-family: var(--font-primary);
        }
        
        .simulation-header {
          text-align: center;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, #0f172a, #0d9488);
          padding: 2rem;
          border-radius: 16px;
          color: white;
          box-shadow: 0 10px 30px rgba(13, 148, 136, 0.15);
        }
        
        .simulation-header h1 {
          font-weight: 300;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
          color: white;
          font-size: 1.8rem;
        }

        .simulation-header p {
          color: #ccfbf1;
          font-size: 0.95rem;
          max-width: 800px;
          margin: 0 auto;
        }

        .settings-bar {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .settings-toggle {
          background: white;
          border: 1px solid #e2e8f0;
          padding: 0.5rem 1.25rem;
          border-radius: 9999px;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 2px 5px rgba(0,0,0,0.03);
          transition: all 0.2s ease;
        }

        .settings-toggle.active {
          border-color: var(--primary);
          color: var(--primary);
          background: var(--primary-glow);
        }

        .device-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr 1fr;
          gap: 2rem;
          align-items: flex-start;
        }

        @media (max-width: 1100px) {
          .device-grid {
            grid-template-columns: 1fr;
            justify-items: center;
          }
        }

        /* --- Device 1: Web Interface --- */
        .web-device {
          width: 100%;
          height: 660px;
          border-radius: 16px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.06);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .web-browser-bar {
          background: #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .browser-buttons {
          display: flex;
          gap: 6px;
        }

        .browser-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .dot-red { background: #ef4444; }
        .dot-yellow { background: #f59e0b; }
        .dot-green { background: #10b981; }

        .browser-address {
          flex: 1;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.75rem;
          color: var(--text-muted);
          padding: 0.2rem 0.75rem;
          text-align: left;
          font-family: monospace;
          white-space: nowrap;
          overflow: hidden;
        }

        .web-content-split {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .web-sidebar {
          width: 180px;
          border-right: 1px solid #e2e8f0;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          padding: 1rem 0.5rem;
        }

        .sidebar-section-title {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          padding: 0 0.5rem 0.5rem 0.5rem;
          font-weight: 700;
        }

        .web-contact-item {
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 0.25rem;
          background: transparent;
          cursor: pointer;
        }

        .web-contact-item.active {
          background: #e2e8f0;
          color: var(--text-primary);
          font-weight: 600;
        }

        .avatar-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #0d9488;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .web-chat-pane {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: white;
          position: relative;
          overflow: hidden;
        }

        .web-chat-header {
          border-bottom: 1px solid #e2e8f0;
          padding: 0.75rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
        }

        .header-profile-info h3 {
          font-size: 0.95rem;
          margin: 0;
          font-weight: 700;
        }
        
        .header-profile-info p {
          font-size: 0.75rem;
          color: #10b981;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .web-call-actions {
          display: flex;
          gap: 0.5rem;
        }

        .call-icon-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          color: var(--text-secondary);
          transition: all 0.2s;
        }

        .call-icon-btn:hover {
          background: var(--primary-glow);
          color: var(--primary);
        }

        .call-icon-btn.call-video:hover {
          background: #d1fae5;
          color: #059669;
        }

        .call-icon-btn.call-voice:hover {
          background: #e0f2fe;
          color: #0284c7;
        }

        .chat-messages-container {
          flex: 1;
          padding: 1.25rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background: #f8fafc;
        }

        .chat-bubble-row {
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .bubble-meta {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-bottom: 2px;
          padding: 0 4px;
        }

        .bubble-bubble {
          padding: 0.7rem 0.9rem;
          border-radius: 12px;
          max-width: 80%;
          font-size: 0.85rem;
          line-height: 1.4;
          word-break: break-word;
        }

        .chat-bubble-row.sent {
          align-items: flex-end;
        }
        .chat-bubble-row.sent .bubble-bubble {
          background: var(--primary);
          color: white;
          border-bottom-right-radius: 2px;
        }

        .chat-bubble-row.received {
          align-items: flex-start;
        }
        .chat-bubble-row.received .bubble-bubble {
          background: white;
          color: var(--text-primary);
          border-bottom-left-radius: 2px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }

        .chat-bubble-row.system-msg {
          align-items: center;
          margin: 0.5rem 0;
        }

        .chat-bubble-row.system-msg .bubble-bubble {
          background: #e2e8f0;
          color: var(--text-secondary);
          font-size: 0.75rem;
          padding: 0.35rem 0.75rem;
          border-radius: 20px;
          text-align: center;
        }

        .chat-input-bar {
          padding: 0.75rem 1rem;
          border-top: 1px solid #e2e8f0;
          background: white;
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .chat-text-input {
          flex: 1;
          border: 1px solid #cbd5e1;
          border-radius: 20px;
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
        }

        .chat-text-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(13,148,136,0.1);
        }

        .chat-send-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-send-btn:hover {
          background: var(--primary-hover);
        }

        .web-right-panel {
          width: 160px;
          border-left: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 1rem;
          font-size: 0.8rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .panel-info-box {
          background: white;
          border: 1px solid #e2e8f0;
          padding: 0.75rem;
          border-radius: 8px;
        }
        .panel-info-box h4 {
          font-size: 0.8rem;
          margin-bottom: 4px;
          color: var(--text-primary);
        }
        .panel-info-box p {
          color: var(--text-secondary);
          font-size: 0.75rem;
          margin: 0;
        }

        /* --- Device 2 & 3: Mobile Frames --- */
        .mobile-device-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .mobile-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* iOS Frame Specifics */
        .ios-device {
          width: 330px;
          height: 660px;
          border-radius: 44px;
          border: 12px solid #0f172a;
          background: #f4f4f5;
          position: relative;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .ios-island {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          width: 100px;
          height: 24px;
          background: #000;
          border-radius: 12px;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .ios-island-camera {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #1e293b;
          margin-right: 30px;
        }

        .ios-status-bar {
          height: 40px;
          padding: 12px 24px 0 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.7rem;
          font-weight: 600;
          color: #000;
          z-index: 99;
          background: #ffffff;
        }

        .ios-status-right {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .ios-header {
          background: #ffffff;
          border-bottom: 1px solid #e4e4e7;
          padding: 0.5rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ios-header-center {
          text-align: center;
        }

        .ios-header-name {
          font-size: 0.85rem;
          font-weight: 700;
          margin: 0;
        }
        .ios-header-sub {
          font-size: 0.65rem;
          color: #10b981;
          margin: 0;
        }

        /* Android Frame Specifics */
        .android-device {
          width: 330px;
          height: 660px;
          border-radius: 36px;
          border: 10px solid #1e293b;
          background: #fafafa;
          position: relative;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .android-punch-hole {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          width: 11px;
          height: 11px;
          background: #000;
          border-radius: 50%;
          z-index: 1000;
        }

        .android-status-bar {
          height: 36px;
          padding: 8px 18px 0 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.7rem;
          font-weight: 500;
          color: #475569;
          background: #f1f5f9;
        }

        .android-status-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .android-header {
          background: #f1f5f9;
          border-bottom: 1px solid #cbd5e1;
          padding: 0.5rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .android-header-center {
          flex: 1;
          margin-left: 10px;
        }

        .android-header-name {
          font-size: 0.85rem;
          font-weight: 700;
          margin: 0;
        }
        .android-header-sub {
          font-size: 0.65rem;
          color: #059669;
          margin: 0;
        }

        .ios-message-input-bar {
          background: #ffffff;
          padding: 0.5rem 1rem;
          border-top: 1px solid #e4e4e7;
          display: flex;
          align-items: center;
          gap: 8px;
          padding-bottom: 1rem;
        }

        .ios-text-input {
          flex: 1;
          background: #f4f4f5;
          border: 1px solid #e4e4e7;
          border-radius: 18px;
          padding: 0.4rem 0.8rem;
          font-size: 0.8rem;
        }

        .ios-send-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #007aff;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
        }

        .android-message-input-bar {
          background: #ffffff;
          padding: 0.5rem 0.75rem;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 6px;
          padding-bottom: 1rem;
        }

        .android-text-input {
          flex: 1;
          background: #f1f5f9;
          border: none;
          border-radius: 24px;
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
        }

        .android-send-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #0d9488;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* iMessage Style Bubbles (iOS) */
        .ios-chat-container {
          flex: 1;
          padding: 0.75rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          background: #ffffff;
        }

        .ios-bubble-row {
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .ios-bubble-row.sent {
          align-items: flex-end;
        }
        .ios-bubble-row.sent .bubble-bubble {
          background: #007aff;
          color: white;
          border-bottom-right-radius: 3px;
          font-size: 0.8rem;
          padding: 0.5rem 0.75rem;
        }

        .ios-bubble-row.received {
          align-items: flex-start;
        }
        .ios-bubble-row.received .bubble-bubble {
          background: #e5e5ea;
          color: black;
          border-bottom-left-radius: 3px;
          font-size: 0.8rem;
          padding: 0.5rem 0.75rem;
        }

        /* Material Style Bubbles (Android) */
        .android-chat-container {
          flex: 1;
          padding: 0.75rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          background: #f8fafc;
        }

        .android-bubble-row {
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .android-bubble-row.sent {
          align-items: flex-end;
        }
        .android-bubble-row.sent .bubble-bubble {
          background: #004d40;
          color: white;
          border-radius: 16px 16px 2px 16px;
          font-size: 0.8rem;
          padding: 0.55rem 0.8rem;
        }

        .android-bubble-row.received {
          align-items: flex-start;
        }
        .android-bubble-row.received .bubble-bubble {
          background: #eceff1;
          color: #263238;
          border-radius: 16px 16px 16px 2px;
          font-size: 0.8rem;
          padding: 0.55rem 0.8rem;
          border: 1px solid #cfd8dc;
        }

        .ios-home-indicator {
          height: 5px;
          width: 120px;
          background: #000;
          border-radius: 10px;
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
        }

        .android-nav-bar {
          height: 12px;
          background: #ffffff;
          position: relative;
        }

        .android-nav-bar::after {
          content: '';
          position: absolute;
          width: 70px;
          height: 4px;
          background: #64748b;
          border-radius: 2px;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
        }

        /* --- ACTIVE CALL OVERLAY --- */
        .call-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          z-index: 100;
          display: flex;
          flex-direction: column;
          color: white;
          padding: 3rem 1.5rem 1.5rem 1.5rem;
          justify-content: space-between;
          align-items: center;
        }

        .ringing-call-top {
          text-align: center;
          margin-top: 1.5rem;
        }

        .ringing-avatar {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          font-weight: 700;
          margin: 0 auto 1rem auto;
          box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.4);
          animation: pulseAvatar 2s infinite;
        }

        @keyframes pulseAvatar {
          0% { box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.6); }
          70% { box-shadow: 0 0 0 20px rgba(13, 148, 136, 0); }
          100% { box-shadow: 0 0 0 0 rgba(13, 148, 136, 0); }
        }

        .ringing-status {
          font-size: 0.8rem;
          color: #2dd4bf;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-top: 0.25rem;
        }

        .call-actions-row {
          display: flex;
          gap: 2rem;
          margin-bottom: 2rem;
          width: 100%;
          justify-content: center;
        }

        .action-circle-btn {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.2rem;
          transition: transform 0.2s;
        }
        
        .action-circle-btn:hover {
          transform: scale(1.1);
        }

        .btn-accept { background: #10b981; }
        .btn-decline { background: #ef4444; }

        /* ACTIVE CONNECTED CALL */
        .active-call-pane {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
        }

        .video-feed-main {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: #1e293b;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .video-placeholder-graphic {
          text-align: center;
          z-index: 2;
        }

        .video-placeholder-graphic svg {
          width: 60px;
          height: 60px;
          margin-bottom: 0.5rem;
          color: rgba(255,255,255,0.4);
          animation: float 3s ease-in-out infinite;
        }

        .video-pip {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 70px;
          height: 105px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.3);
          background: #0f172a;
          z-index: 10;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .video-pip-label {
          position: absolute;
          bottom: 2px;
          left: 4px;
          font-size: 0.5rem;
          background: rgba(0,0,0,0.5);
          padding: 1px 3px;
          border-radius: 2px;
        }

        .call-info-header {
          z-index: 5;
          padding: 1rem;
          background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent);
          width: 100%;
          text-align: center;
        }

        .call-timer {
          font-size: 0.75rem;
          background: rgba(255,255,255,0.15);
          padding: 2px 8px;
          border-radius: 12px;
          display: inline-block;
          font-family: monospace;
          margin-top: 4px;
        }

        .call-controls-bottom {
          z-index: 5;
          padding: 1rem;
          background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .active-controls-row {
          display: flex;
          gap: 1rem;
        }

        .control-pill-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.95rem;
        }

        .control-pill-btn.active {
          background: white;
          color: #1e293b;
        }

        .control-pill-btn.hangup {
          background: #ef4444;
        }

        /* Waveform Animation */
        .audio-visualizer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          height: 40px;
          margin-top: 1rem;
        }

        .visualizer-bar {
          width: 3px;
          background: #2dd4bf;
          border-radius: 3px;
          animation: audioRipple 1.2s ease-in-out infinite;
        }

        @keyframes audioRipple {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }

        .busy-overlay {
          background: rgba(15,23,42,0.85);
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 80;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          padding: 1.5rem;
          text-align: center;
        }
      ` }} />

      {/* Header Panel */}
      <div className="simulation-header">
        <h1>Clinical Consult Chat & Call Simulator</h1>
        <p>
          Simulating end-to-end patient-to-doctor consultations, scheduling, and medical communication layers.
          Send messages or start voice/video calls in real-time across Web, iOS, and Android platforms.
        </p>
      </div>

      {/* Global Config controls */}
      <div className="settings-bar">
        <button
          className={`settings-toggle ${soundEnabled ? 'active' : ''}`}
          onClick={() => setSoundEnabled(!soundEnabled)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {soundEnabled ? (
              <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
            ) : (
              <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
            )}
          </svg>
          Sound Effects: {soundEnabled ? 'Enabled' : 'Muted'}
        </button>
      </div>

      {/* Three Device Flex Workspace */}
      <div className="device-grid">
        
        {/* ================================================================= */}
        {/* DEVICE 1: WEB APPLICATION (Doctor Workspace) */}
        {/* ================================================================= */}
        <div className="web-device-wrapper">
          <div className="mobile-label">Web Console (Doctor View)</div>
          <div className="web-device">
            
            {/* Browser top-bar */}
            <div className="web-browser-bar">
              <div className="browser-buttons">
                <span className="browser-dot dot-red"></span>
                <span className="browser-dot dot-yellow"></span>
                <span className="browser-dot dot-green"></span>
              </div>
              <div className="browser-address">https://medicare.clinic.org/dashboard/chats/consultation-08</div>
            </div>

            {/* Split Screen Application Area */}
            <div className="web-content-split">
              {/* Left sidebar: list of channels */}
              <div className="web-sidebar">
                <span className="sidebar-section-title">Rooms</span>
                <div className="web-contact-item active">
                  <div className="avatar-circle">AK</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.8rem' }}>Arnav Kataria</div>
                    <div style={{ fontSize: '0.65rem', color: '#10b981' }}>Consultation Active</div>
                  </div>
                </div>
              </div>

              {/* Chat pane */}
              <div className="web-chat-pane">
                
                {/* Chat Panel Header */}
                <div className="web-chat-header">
                  <div className="header-profile-info" style={{ textAlign: 'left' }}>
                    <h3>Arnav Kataria</h3>
                    <p>
                      <span className="pulsing-dot" style={{ width: '6px', height: '6px' }}></span>
                      Patient & Caregiver Online
                    </p>
                  </div>
                  
                  {/* Call Initiation controls */}
                  <div className="web-call-actions">
                    <button
                      className="call-icon-btn call-voice"
                      title="Initiate Voice Consultation"
                      onClick={() => startCall('web', 'ios', 'voice')}
                      disabled={call.status !== 'idle'}
                      style={{ cursor: call.status === 'idle' ? 'pointer' : 'not-allowed', opacity: call.status === 'idle' ? 1 : 0.5 }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </button>
                    <button
                      className="call-icon-btn call-video"
                      title="Initiate Video Consultation"
                      onClick={() => startCall('web', 'ios', 'video')}
                      disabled={call.status !== 'idle'}
                      style={{ cursor: call.status === 'idle' ? 'pointer' : 'not-allowed', opacity: call.status === 'idle' ? 1 : 0.5 }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M23 7l-7 5 7 5V7z" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Message logs */}
                <div className="chat-messages-container">
                  {messages.map((msg) => {
                    if (msg.role === 'SYSTEM') {
                      return (
                        <div key={msg.id} className="chat-bubble-row system-msg">
                          <div className="bubble-bubble">{msg.text}</div>
                        </div>
                      );
                    }
                    const isSelf = msg.sender === 'web';
                    return (
                      <div key={msg.id} className={`chat-bubble-row ${isSelf ? 'sent' : 'received'}`}>
                        <div className="bubble-meta">
                          {msg.senderName} • {msg.timestamp}
                        </div>
                        <div className="bubble-bubble">{msg.text}</div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRefs.web} />
                </div>

                {/* Input block */}
                <form
                  className="chat-input-bar"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage('web', inputs.web);
                  }}
                >
                  <input
                    type="text"
                    className="chat-text-input"
                    placeholder="Type diagnosis advice or message..."
                    value={inputs.web}
                    onChange={(e) => setInputs(prev => ({ ...prev, web: e.target.value }))}
                  />
                  <button type="submit" className="chat-send-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </form>

                {/* calling screen overlay (outgoing) */}
                {call.status !== 'idle' && call.sender === 'web' && (
                  <div className="call-overlay">
                    <div className="ringing-call-top">
                      <div className="ringing-avatar">AK</div>
                      <h3>Arnav Kataria</h3>
                      <div className="ringing-status">
                        {call.status === 'ringing' ? 'Calling Patient...' : 'Active Consultation'}
                      </div>
                      {call.status === 'connected' && (
                        <div className="call-timer">{formatCallDuration(call.duration)}</div>
                      )}
                    </div>

                    {/* Interactive video streams if connected */}
                    {call.status === 'connected' && (
                      <div className="video-feed-main">
                        <div className="video-pip">
                          <span className="video-pip-label">Self (Dr.)</span>
                          <div style={{ color: 'white', fontSize: '0.9rem' }}>🩺</div>
                        </div>
                        {call.type === 'video' ? (
                          <div className="video-placeholder-graphic">
                            <svg fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Arnav (Camera Feed)</div>
                            <Visualizer />
                          </div>
                        ) : (
                          <div className="video-placeholder-graphic">
                            <div className="ringing-avatar" style={{ animation: 'none', background: 'rgba(255,255,255,0.1)' }}>AK</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Audio Consultation</div>
                            <Visualizer />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="call-controls-bottom">
                      <div className="active-controls-row">
                        <button
                          className={`control-pill-btn ${callSettings.micMuted ? 'active' : ''}`}
                          onClick={() => setCallSettings(prev => ({ ...prev, micMuted: !prev.micMuted }))}
                          title={callSettings.micMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                        >
                          {callSettings.micMuted ? '🎙️' : '🎤'}
                        </button>
                        <button className="control-pill-btn hangup" onClick={endActiveCall} title="Terminate Consultation">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6c1 .72 2.27.34 2.87-.58l1.45-2.22c.3-.47.9-.7 1.43-.53l4.13 1.34c.6.2.98.79.98 1.43v3.52c0 .88-.72 1.6-1.6 1.6a19.88 19.88 0 0 1-17.65-17.65A1.6 1.6 0 0 1 4 4h3.52c.64 0 1.23.38 1.43.98l1.34 4.13c.17.53-.06 1.13-.53 1.43l-2.22 1.45c-.92.6-1.3 1.87-.58 2.87z" transform="rotate(135 12 12)" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* calling screen overlay (incoming from mobile) */}
                {call.status !== 'idle' && call.receiver === 'web' && (
                  <div className="call-overlay">
                    <div className="ringing-call-top">
                      <div className="ringing-avatar">
                        {call.sender === 'ios' ? 'AK' : 'AK'}
                      </div>
                      <h3>{getDeviceName(call.sender)}</h3>
                      <div className="ringing-status">Incoming {call.type === 'video' ? 'Video' : 'Voice'} Call</div>
                    </div>

                    <div className="call-actions-row">
                      <button className="action-circle-btn btn-accept" onClick={acceptCall} title="Accept Call">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      </button>
                      <button className="action-circle-btn btn-decline" onClick={declineCall} title="Decline Call">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Panel: Patient Records Meta */}
              <div className="web-right-panel">
                <div className="panel-info-box" style={{ textAlign: 'left' }}>
                  <h4>Telemetry Check</h4>
                  <p>Heart Rate: 72 BPM</p>
                  <p>SPO2: 98%</p>
                  <p>BP: 120/80 mmHg</p>
                </div>
                <div className="panel-info-box" style={{ textAlign: 'left' }}>
                  <h4>Next Appointment</h4>
                  <p>June 12, 2:00 PM</p>
                  <p style={{ color: '#0d9488', fontWeight: 600 }}>Virtual Video</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* DEVICE 2: iOS INTERFACE (Patient View) */}
        {/* ================================================================= */}
        <div className="mobile-device-wrapper">
          <div className="mobile-label">iOS Simulation (Patient)</div>
          <div className="ios-device">
            <div className="ios-island">
              <div className="ios-island-camera"></div>
            </div>
            
            {/* Status bar */}
            <div className="ios-status-bar">
              <span>9:41</span>
              <div className="ios-status-right">
                <span>📶</span>
                <span>📶</span>
                <span>🔋 99%</span>
              </div>
            </div>

            {/* Header info */}
            <div className="ios-header">
              <span style={{ color: '#007aff', fontSize: '0.85rem', cursor: 'pointer' }}>◀ Back</span>
              <div className="ios-header-center">
                <p className="ios-header-name">Dr. Sarah Jenkins</p>
                <p className="ios-header-sub">Online</p>
              </div>
              
              {/* Voice / Video buttons inside iOS Bar */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => startCall('ios', 'web', 'voice')}
                  disabled={call.status !== 'idle'}
                  style={{ background: 'none', color: '#007aff', fontSize: '1rem', opacity: call.status === 'idle' ? 1 : 0.4 }}
                >
                  📞
                </button>
                <button
                  onClick={() => startCall('ios', 'web', 'video')}
                  disabled={call.status !== 'idle'}
                  style={{ background: 'none', color: '#007aff', fontSize: '1rem', opacity: call.status === 'idle' ? 1 : 0.4 }}
                >
                  📹
                </button>
              </div>
            </div>

            {/* Chat Thread */}
            <div className="ios-chat-container">
              {messages.map((msg) => {
                if (msg.role === 'SYSTEM') {
                  return (
                    <div key={msg.id} className="chat-bubble-row system-msg" style={{ margin: '4px 0' }}>
                      <div className="bubble-bubble" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>{msg.text}</div>
                    </div>
                  );
                }
                const isSelf = msg.sender === 'ios';
                return (
                  <div key={msg.id} className={`ios-bubble-row ${isSelf ? 'sent' : 'received'}`}>
                    <div className="bubble-meta" style={{ fontSize: '0.6rem', textAlign: isSelf ? 'right' : 'left' }}>
                      {msg.senderName} • {msg.timestamp}
                    </div>
                    <div className="bubble-bubble">{msg.text}</div>
                  </div>
                );
              })}
              <div ref={messagesEndRefs.ios} />
            </div>

            {/* iOS Message input */}
            <form
              className="ios-message-input-bar"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage('ios', inputs.ios);
              }}
            >
              <input
                type="text"
                className="ios-text-input"
                placeholder="iMessage to Doctor..."
                value={inputs.ios}
                onChange={(e) => setInputs(prev => ({ ...prev, ios: e.target.value }))}
              />
              <button type="submit" className="ios-send-btn">▲</button>
            </form>

            <div className="ios-home-indicator"></div>

            {/* Calling Screen overlay inside iOS frame */}
            {call.status !== 'idle' && (call.sender === 'ios' || call.receiver === 'ios') && (
              <div className="call-overlay">
                <div className="ringing-call-top">
                  <div className="ringing-avatar" style={{ background: '#007aff' }}>SJ</div>
                  <h3>Dr. Sarah Jenkins</h3>
                  <div className="ringing-status">
                    {call.status === 'ringing'
                      ? (call.sender === 'ios' ? 'Calling...' : 'Incoming Call')
                      : 'Connected consultation'}
                  </div>
                  {call.status === 'connected' && (
                    <div className="call-timer">{formatCallDuration(call.duration)}</div>
                  )}
                </div>

                {call.status === 'connected' && (
                  <div className="video-feed-main">
                    <div className="video-pip">
                      <span className="video-pip-label">Self</span>
                      <div style={{ color: 'white', fontSize: '0.9rem' }}>🧑</div>
                    </div>
                    {call.type === 'video' ? (
                      <div className="video-placeholder-graphic">
                        <svg fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/>
                        </svg>
                        <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Dr. Sarah (Camera Feed)</div>
                        <Visualizer />
                      </div>
                    ) : (
                      <div className="video-placeholder-graphic">
                        <div className="ringing-avatar" style={{ animation: 'none', background: 'rgba(255,255,255,0.1)' }}>SJ</div>
                        <div style={{ fontSize: '0.75rem' }}>Audio Call</div>
                        <Visualizer />
                      </div>
                    )}
                  </div>
                )}

                {/* Ringing actions */}
                {call.status === 'ringing' && call.receiver === 'ios' ? (
                  <div className="call-actions-row">
                    <button className="action-circle-btn btn-accept" onClick={acceptCall}>Accept</button>
                    <button className="action-circle-btn btn-decline" onClick={declineCall}>Reject</button>
                  </div>
                ) : (
                  <div className="call-controls-bottom">
                    <div className="active-controls-row">
                      <button
                        className={`control-pill-btn ${callSettings.micMuted ? 'active' : ''}`}
                        onClick={() => setCallSettings(prev => ({ ...prev, micMuted: !prev.micMuted }))}
                      >
                        🎤
                      </button>
                      <button className="control-pill-btn hangup" onClick={endActiveCall}>
                        📵
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* DEVICE 3: ANDROID INTERFACE (Caregiver View) */}
        {/* ================================================================= */}
        <div className="mobile-device-wrapper">
          <div className="mobile-label">Android Simulation (Caregiver)</div>
          <div className="android-device">
            <div className="android-punch-hole"></div>

            {/* Status bar */}
            <div className="android-status-bar">
              <span>10:35</span>
              <div className="android-status-right">
                <span>📶</span>
                <span>📶</span>
                <span>🔋 92%</span>
              </div>
            </div>

            {/* Header info */}
            <div className="android-header">
              <span style={{ fontSize: '0.9rem', cursor: 'pointer' }}>◀</span>
              <div className="android-header-center">
                <p className="android-header-name">Dr. Sarah Jenkins</p>
                <p className="android-header-sub">Online</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => startCall('android', 'web', 'voice')}
                  disabled={call.status !== 'idle'}
                  style={{ background: 'none', color: '#0d9488', fontSize: '0.95rem', opacity: call.status === 'idle' ? 1 : 0.4 }}
                >
                  📞
                </button>
                <button
                  onClick={() => startCall('android', 'web', 'video')}
                  disabled={call.status !== 'idle'}
                  style={{ background: 'none', color: '#0d9488', fontSize: '0.95rem', opacity: call.status === 'idle' ? 1 : 0.4 }}
                >
                  📹
                </button>
              </div>
            </div>

            {/* Chat Thread */}
            <div className="android-chat-container">
              {messages.map((msg) => {
                if (msg.role === 'SYSTEM') {
                  return (
                    <div key={msg.id} className="chat-bubble-row system-msg" style={{ margin: '4px 0' }}>
                      <div className="bubble-bubble" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>{msg.text}</div>
                    </div>
                  );
                }
                const isSelf = msg.sender === 'android';
                return (
                  <div key={msg.id} className={`android-bubble-row ${isSelf ? 'sent' : 'received'}`}>
                    <div className="bubble-meta" style={{ fontSize: '0.6rem', textAlign: isSelf ? 'right' : 'left' }}>
                      {msg.senderName} • {msg.timestamp}
                    </div>
                    <div className="bubble-bubble">{msg.text}</div>
                  </div>
                );
              })}
              <div ref={messagesEndRefs.android} />
            </div>

            {/* Android message input */}
            <form
              className="android-message-input-bar"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage('android', inputs.android);
              }}
            >
              <input
                type="text"
                className="android-text-input"
                placeholder="Message details..."
                value={inputs.android}
                onChange={(e) => setInputs(prev => ({ ...prev, android: e.target.value }))}
              />
              <button type="submit" className="android-send-btn">➤</button>
            </form>

            <div className="android-nav-bar"></div>

            {/* Busy overlay logic (if Web and iOS are in a call, Android shows busy/view-only indicator) */}
            {call.status === 'connected' && (call.sender === 'ios' || call.receiver === 'ios') && (
              <div className="busy-overlay">
                <div style={{ fontSize: '2rem' }}>📞</div>
                <h4 style={{ margin: '8px 0 4px 0' }}>Consultation In Progress</h4>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Dr. Sarah and patient Arnav are currently in a live call.
                </p>
              </div>
            )}

            {/* Call Overlay (if Android is calling or being called) */}
            {call.status !== 'idle' && (call.sender === 'android' || call.receiver === 'android') && (
              <div className="call-overlay">
                <div className="ringing-call-top">
                  <div className="ringing-avatar" style={{ background: '#0d9488' }}>SJ</div>
                  <h3>Dr. Sarah Jenkins</h3>
                  <div className="ringing-status">
                    {call.status === 'ringing'
                      ? (call.sender === 'android' ? 'Dialing...' : 'Incoming Call')
                      : 'Connected'}
                  </div>
                  {call.status === 'connected' && (
                    <div className="call-timer">{formatCallDuration(call.duration)}</div>
                  )}
                </div>

                {call.status === 'connected' && (
                  <div className="video-feed-main">
                    <div className="video-pip">
                      <span className="video-pip-label">Self</span>
                      <div style={{ color: 'white', fontSize: '0.9rem' }}>👩‍🦰</div>
                    </div>
                    {call.type === 'video' ? (
                      <div className="video-placeholder-graphic">
                        <svg fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/>
                        </svg>
                        <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Doctor Camera Feed</div>
                        <Visualizer />
                      </div>
                    ) : (
                      <div className="video-placeholder-graphic">
                        <div className="ringing-avatar" style={{ animation: 'none', background: 'rgba(255,255,255,0.1)' }}>SJ</div>
                        <div style={{ fontSize: '0.75rem' }}>Audio Channel</div>
                        <Visualizer />
                      </div>
                    )}
                  </div>
                )}

                {call.status === 'ringing' && call.receiver === 'android' ? (
                  <div className="call-actions-row">
                    <button className="action-circle-btn btn-accept" onClick={acceptCall}>Accept</button>
                    <button className="action-circle-btn btn-decline" onClick={declineCall}>Decline</button>
                  </div>
                ) : (
                  <div className="call-controls-bottom">
                    <div className="active-controls-row">
                      <button
                        className={`control-pill-btn ${callSettings.micMuted ? 'active' : ''}`}
                        onClick={() => setCallSettings(prev => ({ ...prev, micMuted: !prev.micMuted }))}
                      >
                        🎤
                      </button>
                      <button className="control-pill-btn hangup" onClick={endActiveCall}>
                        📵
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChatSimulation;
