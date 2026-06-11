import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
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
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../services/api';
import io from 'socket.io-client';

const ChatSimulationScreen = ({ route, navigation }) => {
  const { contact } = route.params || {};
  const { user, token } = useContext(AuthContext);
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Connect socket
  useEffect(() => {
    if (!token || !contact) return;

    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('[MobileChat] Socket connected');
      // Check if contact is online
      socket.emit('user:status', { targetUserId: contact.id }, (response) => {
        setIsOnline(response?.online || false);
      });
    });

    socket.on('message:received', (message) => {
      if (message.senderId === contact.id || message.receiverId === contact.id) {
        setMessages(prev => [...prev, message]);
        // Mark as read
        if (message.senderId === contact.id) {
          socket.emit('messages:read', { contactId: contact.id });
        }
      }
    });

    socket.on('typing:start', ({ userId, userName }) => {
      if (userId === contact.id) {
        setTyping(userName);
      }
    });

    socket.on('typing:stop', ({ userId }) => {
      if (userId === contact.id) {
        setTyping(null);
      }
    });

    socket.on('user:online', ({ userId, online }) => {
      if (userId === contact.id) {
        setIsOnline(online);
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [token, contact]);

  // Fetch message history
  useEffect(() => {
    if (!token || !contact) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/chat/messages/${contact.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error('[MobileChat] Error fetching messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Mark messages as read
    if (socketRef.current) {
      socketRef.current.emit('messages:read', { contactId: contact.id });
    }
  }, [token, contact]);

  // Update navigation title
  useEffect(() => {
    if (contact) {
      navigation.setOptions({
        headerTitleAlign: 'left',
        headerTitle: () => (
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleText} numberOfLines={1}>{contact.name}</Text>
            <Text style={[styles.headerSubtitle, { color: isOnline ? '#10b981' : '#94a3b8' }]}>
              {isOnline ? '● Online' : '○ Offline'}
            </Text>
          </View>
        ),
        headerRight: () => (
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => Alert.alert('Coming Soon', 'Voice call feature coming in Step 2')}
              style={styles.headerCallBtn}
            >
              <Ionicons name="call-outline" size={20} color="#0d9488" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Alert.alert('Coming Soon', 'Video call feature coming in Step 2')}
              style={styles.headerCallBtn}
            >
              <Ionicons name="videocam-outline" size={20} color="#0d9488" />
            </TouchableOpacity>
          </View>
        )
      });
    }
  }, [contact, isOnline, navigation]);

  const handleSendMessage = useCallback(() => {
    if (!inputText.trim() || !socketRef.current) return;

    const content = inputText.trim();
    setInputText('');

    socketRef.current.emit('message:send', {
      receiverId: contact.id,
      content
    }, (response) => {
      if (response.success) {
        setMessages(prev => [...prev, response.message]);
      } else {
        console.error('[MobileChat] Send failed:', response.error);
      }
    });

    // Stop typing indicator
    socketRef.current.emit('typing:stop', { receiverId: contact.id });
  }, [inputText, contact]);

  const handleInputChange = (text) => {
    setInputText(text);
    if (!socketRef.current || !contact) return;

    socketRef.current.emit('typing:start', { receiverId: contact.id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit('typing:stop', { receiverId: contact.id });
      }
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
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }) => {
    const isMine = item.senderId === user?.id;
    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowSent : styles.msgRowReceived]}>
        <Text style={styles.msgMeta}>
          {item.sender?.name || (isMine ? user.name : contact.name)} • {formatTime(item.createdAt)}
        </Text>
        <View style={[styles.msgBubble, isMine ? styles.msgBubbleSent : styles.msgBubbleReceived]}>
          <Text style={[styles.msgText, isMine ? styles.msgTextSent : styles.msgTextReceived]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  if (!contact) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text>No contact selected</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#0d9488" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Ionicons name="chatbubble-outline" size={40} color="#cbd5e1" />
              <Text style={styles.emptyMessagesText}>No messages yet. Say hello!</Text>
            </View>
          }
          ListFooterComponent={
            typing ? (
              <View style={styles.typingContainer}>
                <Text style={styles.typingText}>{typing} is typing...</Text>
              </View>
            ) : null
          }
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder={`Message ${contact.name}...`}
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 6,
  },
  headerCallBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: -8,
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineText: {
    fontSize: 12,
    color: '#64748b',
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  msgRow: {
    marginBottom: 12,
    maxWidth: '78%',
  },
  msgRowSent: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  msgRowReceived: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  msgMeta: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 3,
    paddingHorizontal: 4,
  },
  msgBubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  msgBubbleSent: {
    backgroundColor: '#0d9488',
    borderBottomRightRadius: 4,
  },
  msgBubbleReceived: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 21,
  },
  msgTextSent: {
    color: '#ffffff',
  },
  msgTextReceived: {
    color: '#0f172a',
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#0f172a',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyMessagesText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});

export default ChatSimulationScreen;
