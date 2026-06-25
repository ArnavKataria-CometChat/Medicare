import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useCometChatContext } from '../context/CometChatContext';
import { API_BASE_URL } from '../services/api';

let CometChatConversations = null;
let CometChat = null;

try {
  const uikit = require('@cometchat/chat-uikit-react-native');
  CometChatConversations = uikit.CometChatConversations;
  CometChat = require('@cometchat/chat-sdk-react-native').CometChat;
} catch (e) {
  console.warn('[ChatsListScreen] CometChat not available:', e.message);
}

const ChatsListScreen = ({ navigation }) => {
  const { user, token } = useContext(AuthContext);
  const { isReady } = useCometChatContext();
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Group states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const toggleMemberSelection = (uid) => {
    setSelectedMembers(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name.');
      return;
    }
    try {
      const guid = 'group_' + Date.now();
      const group = new CometChat.Group(
        guid,
        groupName.trim(),
        CometChat.GROUP_TYPE.PUBLIC,
        ''
      );

      const createdGroup = await CometChat.createGroup(group);
      console.log('[ChatsListScreen] Group created:', createdGroup);

      if (selectedMembers.length > 0) {
        const membersList = selectedMembers.map(
          (uid) => new CometChat.GroupMember(uid, CometChat.GROUP_MEMBER_SCOPE.PARTICIPANT)
        );
        await CometChat.addMembersToGroup(guid, membersList, []);
      }

      setGroupName('');
      setSelectedMembers([]);
      setShowCreateGroupModal(false);
      
      navigation.navigate('ChatSimulation', {
        group: {
          guid: createdGroup.getGuid(),
          name: createdGroup.getName(),
        },
      });
    } catch (err) {
      console.error('[ChatsListScreen] Error creating group:', err);
      Alert.alert('Error', 'Failed to create group: ' + (err.message || err.errorDescription || err));
    }
  };
  const [showContacts, setShowContacts] = useState(false);

  // Fetch appointment-based contacts from backend
  const fetchContacts = useCallback(async () => {
    if (!token) return;
    setLoadingContacts(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cometchat/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('[ChatsListScreen] Error fetching contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  }, [token]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Refresh on screen focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchContacts();
    });
    return unsubscribe;
  }, [navigation, fetchContacts]);

  // Handle CometChat conversation tap
  const handleConversationPress = (conversation) => {
    const conversationWith = conversation.getConversationWith();
    if (conversation.getConversationType() === 'user') {
      navigation.navigate('ChatSimulation', {
        contact: {
          id: conversationWith.getUid(),
          name: conversationWith.getName(),
          cometChatUid: conversationWith.getUid(),
          role: conversationWith.getRole() || 'PATIENT',
        },
      });
    } else if (conversation.getConversationType() === 'group') {
      navigation.navigate('ChatSimulation', {
        group: {
          guid: conversationWith.getGuid(),
          name: conversationWith.getName(),
        },
      });
    }
  };

  // Handle tapping a contact from custom list
  const handleContactPress = (contact) => {
    if (!contact.cometChatUid) {
      console.warn('[ChatsListScreen] Contact has no cometChatUid:', contact.name);
      return;
    }
    navigation.navigate('ChatSimulation', { contact });
    setShowContacts(false);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.replace(/^dr\.\s+/i, '').trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Staff users see nothing
  if (user?.role === 'STAFF') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyTitle}>Chat Unavailable</Text>
          <Text style={styles.emptyDesc}>Staff accounts do not have messaging access.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // CometChat SDK not available (Expo Go without dev build)
  if (!CometChatConversations) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyTitle}>Development Build Required</Text>
          <Text style={styles.emptyDesc}>
            CometChat requires a native development build. Run "npx expo run:ios" from your terminal to enable chat features.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // CometChat not ready yet
  if (!isReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#0d9488" />
          <Text style={styles.loadingText}>Connecting to chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isDoctorUser = user?.role === 'DOCTOR';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {isDoctorUser && (
            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={() => setShowCreateGroupModal(true)}
            >
              <Ionicons name="people-outline" size={20} color="#0d9488" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.newChatBtn}
            onPress={() => setShowContacts(!showContacts)}
          >
            <Ionicons name={showContacts ? 'close' : 'create-outline'} size={20} color="#0d9488" />
          </TouchableOpacity>
        </View>
      </View>

      {showContacts ? (
        /* Custom contacts panel — appointment-based from backend */
        <View style={styles.contactsPanel}>
          <Text style={styles.contactsPanelTitle}>Your Contacts</Text>
          {loadingContacts ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="small" color="#0d9488" />
            </View>
          ) : contacts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyDesc}>
                {user?.role === 'PATIENT'
                  ? 'Book an appointment with a doctor to start chatting'
                  : 'Your patients will appear here once they book appointments'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.contactsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.contactItem}
                  onPress={() => handleContactPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactAvatarText}>{getInitials(item.name)}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.contactSub}>
                      {item.specialization || item.role?.toLowerCase()}
                    </Text>
                  </View>
                  <Ionicons name="chatbubble-outline" size={18} color="#0d9488" />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      ) : (
        /* CometChat Conversations — real-time with presence, typing, unread */
        <View style={styles.conversationsContainer}>
          {CometChatConversations ? (
            <CometChatConversations
              onItemPress={handleConversationPress}
              hideHeader={true}
              conversationsRequestBuilder={(() => {
                const builder = new CometChat.ConversationsRequestBuilder().setLimit(30);
                const originalBuild = builder.build;
                builder.build = function() {
                  const request = originalBuild.apply(this, arguments);
                  const originalFetchNext = request.fetchNext;
                  if (originalFetchNext) {
                    request.fetchNext = function() {
                      return originalFetchNext.apply(this, arguments).then((conversations) => {
                        if (!conversations) return conversations;
                        
                        conversations.forEach(conv => {
                          const conversationWith = conv.getConversationWith();
                          if (conversationWith) {
                            const isUser = conv.getConversationType() === 'user';
                            const isGroup = conv.getConversationType() === 'group';
                            
                            let name = '';
                            if (typeof conversationWith.getName === 'function') name = conversationWith.getName();
                            else if (conversationWith.name) name = conversationWith.name;

                            let role = '';
                            if (typeof conversationWith.getRole === 'function') role = conversationWith.getRole();
                            else if (conversationWith.role) role = conversationWith.role;

                            let uid = '';
                            if (typeof conversationWith.getUid === 'function') uid = conversationWith.getUid();
                            else if (conversationWith.uid) uid = conversationWith.uid;

                            const isDoctor = isUser && (role === 'doctor' || name.toLowerCase().startsWith('dr.'));
                            const isAIAgent = isUser && uid === 'medicare_ai_assistant';

                            // Strip "Dr." prefix so initials render as "RC" not "DR"
                            if (isDoctor) {
                              const cleanName = name.replace(/^dr\.\s+/i, '').trim();
                              if (typeof conversationWith.setName === 'function') conversationWith.setName(cleanName);
                              conversationWith.name = cleanName;
                            } else if (isAIAgent) {
                              if (typeof conversationWith.setName === 'function') conversationWith.setName('AI Assistant');
                              conversationWith.name = 'AI Assistant';
                            }
                          }
                        });

                        return conversations.filter(conv => {
                          const conversationWith = conv.getConversationWith();
                          if (conv.getConversationType() === 'user' && conversationWith) {
                            const uid = typeof conversationWith.getUid === 'function'
                              ? conversationWith.getUid() : conversationWith.uid;
                            return uid !== 'medicare_ai_assistant';
                          }
                          return true;
                        });
                      });
                    };
                  }
                  return request;
                };
                return builder;
              })()}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>Chat requires a development build</Text>
              <Text style={styles.emptyDesc}>
                CometChat native modules are not available in Expo Go. Use a development build (npx expo run:ios) to enable chat.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Group Creation Modal */}
      <Modal
        visible={showCreateGroupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCreateGroupModal(false);
          setSelectedMembers([]);
          setGroupName('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Group Chat</Text>
            
            <Text style={styles.fieldLabel}>Group Name</Text>
            <TextInput
              style={styles.textInput}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="e.g. Cardiology Discussion"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Select Members</Text>
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 200, marginBottom: 15 }}
              renderItem={({ item }) => {
                const isSelected = selectedMembers.includes(item.cometChatUid);
                return (
                  <TouchableOpacity
                    style={[styles.memberRow, isSelected && styles.memberRowSelected]}
                    onPress={() => toggleMemberSelection(item.cometChatUid)}
                  >
                    <Text style={[styles.memberName, isSelected && styles.memberNameSelected]}>
                      {item.name} ({item.specialization || item.role?.toLowerCase()})
                    </Text>
                    <Ionicons
                      name={isSelected ? 'checkbox-outline' : 'square-outline'}
                      size={20}
                      color={isSelected ? '#0d9488' : '#94a3b8'}
                    />
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowCreateGroupModal(false);
                  setSelectedMembers([]);
                  setGroupName('');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateGroup}
              >
                <Text style={styles.submitBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  newChatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationsContainer: {
    flex: 1,
  },
  contactsPanel: {
    flex: 1,
  },
  contactsPanelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  contactsList: {
    padding: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  contactSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#f8fafc',
  },
  memberRowSelected: {
    backgroundColor: '#f0fdfa',
    borderColor: '#0d9488',
    borderWidth: 1,
  },
  memberName: {
    fontSize: 13,
    color: '#334155',
  },
  memberNameSelected: {
    color: '#0f766e',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 15,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  submitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0d9488',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ChatsListScreen;
