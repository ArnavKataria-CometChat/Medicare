import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const ChatSimulationScreen = ({ route, navigation }) => {
  const { contact } = route.params || { contact: { id: '1', name: 'Dr. Sarah Jenkins', desc: 'Cardiology Specialist', initials: 'SJ', role: 'DOCTOR' } };

  // Pre-seeded messages mapping by contact ID
  const initialMessagesMap = {
    '1': [
      { id: '1', sender: 'doctor', senderName: 'Dr. Sarah Jenkins', content: 'Hello Arnav, I reviewed your clinical data and ECG telemetry from yesterday. Everything looks normal, but I would like to check how you are feeling today.', time: '10:30 AM' },
      { id: '2', sender: 'patient', senderName: 'Arnav Kataria', content: 'Thanks, Dr. Sarah! I have been feeling much better. Just some mild fatigue in the evenings.', time: '10:32 AM' },
      { id: '3', sender: 'caregiver', senderName: 'Ananya Kataria', content: 'Hello doctor, I am monitoring his diet and water intake closely. Should we adjust his evening dosage if the fatigue persists?', time: '10:35 AM' }
    ],
    '2': [
      { id: '1', sender: 'caregiver', senderName: 'Ananya Kataria', content: 'Hello doctor, do you have a brief moment today to review the blood sugar levels?', time: '09:15 AM' },
      { id: '2', sender: 'doctor', senderName: 'Dr. Marcus Vance', content: 'Yes Ananya, please send the records here or click call to start a audio consultation.', time: '09:20 AM' }
    ],
    '3': [
      { id: '1', sender: 'doctor', senderName: 'Dr. Evelyn Ross', content: 'Jane, please ensure you log your blood pressure values daily before breakfast.', time: 'Yesterday' }
    ]
  };

  const [messages, setMessages] = useState(
    initialMessagesMap[contact.id] || [
      { id: '1', sender: contact.role === 'DOCTOR' ? 'doctor' : 'patient', senderName: contact.name, content: `Hello, this is ${contact.name}. How can I assist you today?`, time: '10:00 AM' }
    ]
  );

  const [inputText, setInputText] = useState('');
  
  // Call states:
  // status: 'idle' | 'ringing' | 'connected'
  // type: 'voice' | 'video'
  const [callStatus, setCallStatus] = useState('idle');
  const [callType, setCallType] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const flatListRef = useRef();
  const timerIntervalRef = useRef(null);
  const ringTimeoutRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Call timer and automatic accept
  useEffect(() => {
    if (callStatus === 'ringing') {
      // Auto-connect call after 2.5 seconds to simulate doctor picking up
      ringTimeoutRef.current = setTimeout(() => {
        setCallStatus('connected');
      }, 2500);
    } else if (callStatus === 'connected') {
      timerIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [callStatus]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    };
  }, []);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMsg = {
      id: Date.now().toString(),
      sender: 'patient',
      senderName: 'Arnav Kataria',
      content: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');

    // Simulate doctor replying after 1.5 seconds
    setTimeout(() => {
      const docReply = {
        id: (Date.now() + 1).toString(),
        sender: 'doctor',
        senderName: contact.name,
        content: `Got it. Thanks for the update. I have logged this. Please click the video call icon above if you'd like to talk directly.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, docReply]);
    }, 1500);
  };

  const startCall = (type) => {
    setCallType(type);
    setCallStatus('ringing');
    setCallDuration(0);
    setMicMuted(false);
    setCameraOff(false);
  };

  const endCall = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);

    // Append call outcome to chat logs
    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    const durStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const logMsg = {
      id: Date.now().toString(),
      sender: 'system',
      senderName: 'System',
      content: `📞 ${callType === 'video' ? 'Video' : 'Voice'} call ended • Duration: ${durStr}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, logMsg]);
    setCallStatus('idle');
    setCallType(null);
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const renderMessageItem = ({ item }) => {
    if (item.sender === 'system') {
      return (
        <View style={styles.systemRow}>
          <Text style={styles.systemText}>{item.content}</Text>
        </View>
      );
    }

    const isSelf = item.sender === 'patient';
    let bubbleBg = '#ffffff';
    let textColor = '#1e293b';
    let bubbleAlign = 'flex-start';

    if (isSelf) {
      bubbleBg = '#0d9488'; // Teal
      textColor = '#ffffff';
      bubbleAlign = 'flex-end';
    } else if (item.sender === 'caregiver') {
      bubbleBg = '#f1f5f9'; // Slate caregiver bubble
    }

    return (
      <View style={[styles.msgRow, { alignSelf: bubbleAlign }]}>
        {!isSelf && (
          <Text style={styles.senderNameText}>
            {item.senderName} • {item.time}
          </Text>
        )}
        {isSelf && (
          <Text style={[styles.senderNameText, { textAlign: 'right' }]}>
            You • {item.time}
          </Text>
        )}
        <View style={[styles.bubble, { backgroundColor: bubbleBg }, isSelf ? styles.selfBubble : styles.otherBubble]}>
          <Text style={[styles.bubbleText, { color: textColor }]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  // Soundwave ripple rendering
  const RippleBars = () => {
    return (
      <View style={styles.rippleRow}>
        <View style={[styles.rippleBar, { height: 16 }]} />
        <View style={[styles.rippleBar, { height: 28 }]} />
        <View style={[styles.rippleBar, { height: 42 }]} />
        <View style={[styles.rippleBar, { height: 20 }]} />
        <View style={[styles.rippleBar, { height: 32 }]} />
        <View style={[styles.rippleBar, { height: 16 }]} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Top Header with Call Buttons */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color="#0d9488" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{contact.name}</Text>
            <Text style={styles.headerSub}>{contact.specialty || contact.desc}</Text>
          </View>
          <View style={styles.callBtns}>
            <TouchableOpacity onPress={() => startCall('voice')} style={styles.callBtn}>
              <Ionicons name="call" size={20} color="#0d9488" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => startCall('video')} style={styles.callBtn}>
              <Ionicons name="videocam" size={20} color="#0d9488" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Message Feed */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.feedContainer}
          showsVerticalScrollIndicator={false}
        />

        {/* Keyboard Input area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type message for consult room..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ========================================================== */}
      {/* FULL SCREEN CALL MODAL */}
      {/* ========================================================== */}
      <Modal
        visible={callStatus !== 'idle'}
        animationType="slide"
        transparent={false}
      >
        <View style={styles.callContainer}>
          {/* Main Video Background View */}
          {callStatus === 'connected' && callType === 'video' && !cameraOff && (
            <View style={styles.videoStreamBg}>
              <Ionicons name="person" size={150} color="rgba(255,255,255,0.15)" />
              <Text style={styles.liveFeedLabel}>{contact.name} Camera (Simulated Feed)</Text>
            </View>
          )}

          {/* Caller Details Header */}
          <View style={styles.callHeader}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{contact.initials}</Text>
            </View>
            <Text style={styles.callerName}>{contact.name}</Text>
            <Text style={styles.callStatusText}>
              {callStatus === 'ringing' ? 'Ringing...' : 'Connected Consultation'}
            </Text>
            {callStatus === 'connected' && (
              <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>
            )}
          </View>

          {/* Connected state visuals */}
          {callStatus === 'connected' && (
            <View style={styles.connectedVisualArea}>
              {callType === 'video' ? (
                // PIP self frame
                <View style={styles.pipCamera}>
                  <Text style={styles.pipLabel}>Self</Text>
                  <Ionicons name="camera-reverse" size={24} color="rgba(255,255,255,0.6)" />
                </View>
              ) : (
                // Voice call ripple wave
                <RippleBars />
              )}
            </View>
          )}

          {/* Controls Bar */}
          <View style={styles.controlsBar}>
            {callStatus === 'connected' && (
              <View style={styles.midControlsRow}>
                <TouchableOpacity
                  style={[styles.controlCircle, micMuted && styles.controlCircleActive]}
                  onPress={() => setMicMuted(!micMuted)}
                >
                  <Ionicons name={micMuted ? "mic-off" : "mic"} size={22} color={micMuted ? "#0f172a" : "#ffffff"} />
                </TouchableOpacity>

                {callType === 'video' && (
                  <TouchableOpacity
                    style={[styles.controlCircle, cameraOff && styles.controlCircleActive]}
                    onPress={() => setCameraOff(!cameraOff)}
                  >
                    <Ionicons name={cameraOff ? "videocam-off" : "videocam"} size={22} color={cameraOff ? "#0f172a" : "#ffffff"} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* End Call Button */}
            <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
              <Ionicons name="call-outline" size={26} color="#ffffff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerBack: {
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 12,
    color: '#0d9488',
    fontWeight: '500',
  },
  callBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  msgRow: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  senderNameText: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selfBubble: {
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  systemRow: {
    alignItems: 'center',
    marginVertical: 12,
    width: '100%',
  },
  systemText: {
    fontSize: 12,
    color: '#64748b',
    backgroundColor: '#e2e8f0',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },

  /* CALL OVERLAY STYLING */
  callContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  videoStreamBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.85,
  },
  liveFeedLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  callHeader: {
    alignItems: 'center',
    zIndex: 10,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
  },
  callerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  callStatusText: {
    fontSize: 14,
    color: '#2dd4bf',
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  callDuration: {
    fontSize: 16,
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  connectedVisualArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  pipCamera: {
    position: 'absolute',
    top: 20,
    right: 0,
    width: 90,
    height: 140,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  pipLabel: {
    position: 'absolute',
    bottom: 4,
    fontSize: 10,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  rippleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rippleBar: {
    width: 4,
    backgroundColor: '#2dd4bf',
    borderRadius: 2,
  },
  controlsBar: {
    alignItems: 'center',
    width: '100%',
    zIndex: 10,
  },
  midControlsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 30,
  },
  controlCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlCircleActive: {
    backgroundColor: '#ffffff',
  },
  endCallBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  }
});

export default ChatSimulationScreen;
