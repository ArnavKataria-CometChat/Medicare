import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useCometChatContext } from '../context/CometChatContext';
import { API_BASE_URL } from '../services/api';

let CometChatMessageList = null;
let CometChatMessageComposer = null;
let CometChatMessageHeader = null;
let CometChatCallButtons = null;
let CometChat = null;

try {
  const uikit = require('@cometchat/chat-uikit-react-native');
  CometChatMessageList = uikit.CometChatMessageList;
  CometChatMessageComposer = uikit.CometChatMessageComposer;
  CometChatMessageHeader = uikit.CometChatMessageHeader;
  CometChatCallButtons = uikit.CometChatCallButtons;
  CometChat = require('@cometchat/chat-sdk-react-native').CometChat;
} catch (e) {
  console.warn('[ChatSimulationScreen] CometChat not available:', e.message);
}

const ChatSimulationScreen = ({ route, navigation }) => {
  const { contact, group } = route.params || {};
  const { user, token } = useContext(AuthContext);
  const { isReady, cometChatUid } = useCometChatContext();
  const [ccUser, setCcUser] = useState(null);
  const [ccGroup, setCcGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Group member states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);

  // Fetch approved contacts to gate composer
  useEffect(() => {
    if (!token) return;
    const fetchContacts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/cometchat/contacts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setContacts(data.contacts || []);
        }
      } catch (err) {
        console.error('[ChatScreen] Error fetching contacts:', err);
      } finally {
        setLoadingContacts(false);
      }
    };
    fetchContacts();
  }, [token]);

  const isDoctorUser = user?.role === 'DOCTOR';

  // Fetch the CometChat user object from their UID
  useEffect(() => {
    if (!contact || !isReady) return;

    const fetchUser = async () => {
      try {
        const uid = contact.cometChatUid || contact.id;
        const fetchedUser = await CometChat.getUser(uid);
        if (fetchedUser) {
          const role = fetchedUser.getRole?.() || fetchedUser.role || '';
          const name = fetchedUser.getName?.() || fetchedUser.name || '';
          const isDoctor = role === 'doctor' || name.toLowerCase().startsWith('dr.');
          const isAIAgent = uid === 'medicare_ai_assistant';
          
          if (isDoctor || isAIAgent) {
            if (isDoctor) {
              const cleanName = name.replace(/^dr\.\s+/i, '').trim();
              if (typeof fetchedUser.setName === 'function') fetchedUser.setName(cleanName);
              fetchedUser.name = cleanName;
            } else if (isAIAgent) {
              if (typeof fetchedUser.setName === 'function') fetchedUser.setName('AI');
              fetchedUser.name = 'AI';
            }
          }
        }
        setCcUser(fetchedUser);
      } catch (err) {
        console.error('[ChatScreen] Error fetching CometChat user:', err);
        setError('Could not load this conversation. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [contact, isReady]);

  // Fetch the CometChat group object
  useEffect(() => {
    if (!group || !isReady) return;

    const fetchGroup = async () => {
      try {
        const fetchedGroup = await CometChat.getGroup(group.guid);
        setCcGroup(fetchedGroup);
      } catch (err) {
        console.error('[ChatScreen] Error fetching CometChat group:', err);
        setError('Could not load this group. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [group, isReady]);

  // Group handlers
  const handleAddMember = async (uid) => {
    if (!ccGroup) return;
    try {
      const membersList = [
        new CometChat.GroupMember(uid, CometChat.GROUP_MEMBER_SCOPE.PARTICIPANT)
      ];
      await CometChat.addMembersToGroup(ccGroup.getGuid(), membersList, []);
      Alert.alert('Success', 'Member added successfully!');
      setShowAddMemberModal(false);
    } catch (err) {
      console.error('[ChatScreen] Error adding member:', err);
      Alert.alert('Error', 'Failed to add member: ' + (err.message || err.errorDescription || err));
    }
  };

  const fetchGroupMembers = async () => {
    if (!ccGroup) return;
    try {
      const groupMembersRequest = new CometChat.GroupMembersRequestBuilder(ccGroup.getGuid())
        .setLimit(100)
        .build();
      const members = await groupMembersRequest.fetchNext();
      setGroupMembers(members || []);
      setShowManageMembersModal(true);
    } catch (err) {
      console.error('[ChatScreen] Error fetching group members:', err);
    }
  };

  const handleRemoveMember = async (uid) => {
    if (!ccGroup) return;
    try {
      await CometChat.kickGroupMember(ccGroup.getGuid(), uid);
      setGroupMembers(prev => prev.filter(m => m.getUid() !== uid));
    } catch (err) {
      console.error('[ChatScreen] Error removing member:', err);
      Alert.alert('Error', 'Failed to remove member: ' + (err.message || err.errorDescription || err));
    }
  };

  const handleDeleteGroup = () => {
    if (!ccGroup) return;
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? All messages will be permanently lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await CometChat.deleteGroup(ccGroup.getGuid());
              navigation.goBack();
            } catch (err) {
              console.error('[ChatScreen] Error deleting group:', err);
              Alert.alert('Error', 'Failed to delete group: ' + (err.message || err.errorDescription || err));
            }
          }
        }
      ]
    );
  };

  // Set navigation header
  useEffect(() => {
    navigation.setOptions({
      headerTitle: '',
      headerRight: () => null,
    });
  }, [navigation]);

  if (!contact && !group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>No conversation selected</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isReady || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0d9488" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setError(null);
              setLoading(true);
            }}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!ccUser && !ccGroup) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Conversation target not found in chat system</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If CometChat components aren't available (Expo Go), show fallback
  if (!CometChatMessageList || !CometChatMessageComposer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="chatbubbles-outline" size={48} color="#94a3b8" />
          <Text style={styles.errorText}>Chat requires a development build</Text>
          <Text style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4 }}>
            CometChat native modules are not available in Expo Go. Use npx expo run:ios to enable chat.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const targetUid = contact?.cometChatUid || contact?.id;
  const isPatientDoctorChat = ccUser
    ? ((user?.role === 'PATIENT' && ccUser.getRole() === 'doctor') ||
       (user?.role === 'DOCTOR' && ccUser.getRole() === 'patient'))
    : false;
  const matchedContact = targetUid
    ? contacts.find(c => c.id === targetUid || c.cometChatUid === targetUid)
    : null;
  const isChatAllowed = !isPatientDoctorChat || (matchedContact && !matchedContact.chatEnded);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Message Header — shows name, presence status, call buttons & group menu */}
        <View style={styles.messageHeader}>
          {ccUser ? (
            <CometChatMessageHeader
              user={ccUser}
              hideVideoCallButton={true}
              hideVoiceCallButton={true}
              AuxiliaryButtonView={isDoctorUser ? () => (
                <View style={styles.headerCallButtons}>
                  <CometChatCallButtons user={ccUser} />
                </View>
              ) : undefined}
            />
          ) : (
            <CometChatMessageHeader
              group={ccGroup}
              hideVideoCallButton={true}
              hideVoiceCallButton={true}
              AuxiliaryButtonView={() => (
                <View style={styles.headerCallButtons}>
                  <CometChatCallButtons
                    group={ccGroup}
                    {...(!isDoctorUser && { hideVideoCallButton: true, hideVoiceCallButton: true })}
                  />
                </View>
              )}
              options={group && isDoctorUser && ccGroup && ccGroup.getOwner() === cometChatUid ? () => [
                { id: 'add-member', text: 'Add Member', onPress: () => setShowAddMemberModal(true) },
                { id: 'manage-members', text: 'Manage Members', onPress: fetchGroupMembers },
                { id: 'delete-group', text: 'Delete Group', onPress: handleDeleteGroup },
              ] : undefined}
            />
          )}
        </View>

        {/* Message List — real-time messages, typing, read receipts */}
        <View style={styles.messageList}>
          {ccUser ? (
            <CometChatMessageList
              user={ccUser}
              messageRequestBuilder={(() => {
                const builder = new CometChat.MessagesRequestBuilder().setLimit(30);
                const originalBuild = builder.build;
                builder.build = function() {
                  const request = originalBuild.apply(this, arguments);
                  const originalFetchPrevious = request.fetchPrevious;
                  if (originalFetchPrevious) {
                    request.fetchPrevious = function() {
                      return originalFetchPrevious.apply(this, arguments).then((messages) => {
                        if (!messages) return messages;
                        
                        messages.forEach(msg => {
                          const sender = typeof msg.getSender === 'function' ? msg.getSender() : msg.sender;
                          if (sender) {
                            const role = sender.getRole?.() || sender.role || '';
                            const name = sender.getName?.() || sender.name || '';
                            const isDoctor = role === 'doctor' || name.toLowerCase().startsWith('dr.');
                            if (isDoctor) {
                              const cleanName = name.replace(/^dr\.\s+/i, '').trim();
                              if (typeof sender.setName === 'function') sender.setName(cleanName);
                              sender.name = cleanName;
                            }
                          }
                        });

                        const seenCalls = new Set();
                        return messages.filter((msg) => {
                          const isCall = msg.getCategory?.() === 'call' || msg.category === 'call';
                          if (isCall) {
                            const action = msg.getAction?.() || msg.action;
                            const sessionId = msg.getSessionId?.() || msg.sessionId || (msg.getData?.()?.sessionId);
                            if (action && sessionId) {
                              const key = `${sessionId}-${action}`;
                              if (seenCalls.has(key)) return false;
                              seenCalls.add(key);
                            }
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
            <CometChatMessageList
              group={ccGroup}
              messageRequestBuilder={(() => {
                const builder = new CometChat.MessagesRequestBuilder().setLimit(30);
                const originalBuild = builder.build;
                builder.build = function() {
                  const request = originalBuild.apply(this, arguments);
                  const originalFetchPrevious = request.fetchPrevious;
                  if (originalFetchPrevious) {
                    request.fetchPrevious = function() {
                      return originalFetchPrevious.apply(this, arguments).then((messages) => {
                        if (!messages) return messages;
                        
                        messages.forEach(msg => {
                          const sender = typeof msg.getSender === 'function' ? msg.getSender() : msg.sender;
                          if (sender) {
                            const role = sender.getRole?.() || sender.role || '';
                            const name = sender.getName?.() || sender.name || '';
                            const isDoctor = role === 'doctor' || name.toLowerCase().startsWith('dr.');
                            if (isDoctor) {
                              const cleanName = name.replace(/^dr\.\s+/i, '').trim();
                              if (typeof sender.setName === 'function') sender.setName(cleanName);
                              sender.name = cleanName;
                            }
                          }
                        });

                        const seenCalls = new Set();
                        return messages.filter((msg) => {
                          const isCall = msg.getCategory?.() === 'call' || msg.category === 'call';
                          if (isCall) {
                            const action = msg.getAction?.() || msg.action;
                            const sessionId = msg.getSessionId?.() || msg.sessionId || (msg.getData?.()?.sessionId);
                            if (action && sessionId) {
                              const key = `${sessionId}-${action}`;
                              if (seenCalls.has(key)) return false;
                              seenCalls.add(key);
                            }
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
          )}
        </View>

        {/* Message Composer — text input, attachments, send */}
        {isChatAllowed ? (
          <View style={styles.messageComposer}>
            {ccUser ? (
              <CometChatMessageComposer user={ccUser} />
            ) : (
              <CometChatMessageComposer group={ccGroup} />
            )}
          </View>
        ) : (
          <View style={styles.gatedComposerBanner}>
            <Ionicons name="lock-closed-outline" size={16} color="#b91c1c" />
            <Text style={styles.gatedComposerText}>
              This consultation chat is closed or request is pending.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Add Member Modal */}
      <Modal
        visible={showAddMemberModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddMemberModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Member to Group</Text>
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.checklistRow}>
                  <Text style={styles.checklistText}>{item.name}</Text>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleAddMember(item.cometChatUid)}
                  >
                    <Text style={styles.actionBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              )}
              style={{ maxHeight: 250, marginBottom: 15 }}
            />
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowAddMemberModal(false)}
            >
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manage Members Modal */}
      <Modal
        visible={showManageMembersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowManageMembersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage Members</Text>
            <FlatList
              data={groupMembers}
              keyExtractor={(item) => item.getUid()}
              renderItem={({ item }) => (
                <View style={styles.checklistRow}>
                  <Text style={styles.checklistText}>{item.getName()} ({item.getRole()})</Text>
                  {item.getUid() !== cometChatUid && (
                    <TouchableOpacity
                      style={styles.dangerBtn}
                      onPress={() => handleRemoveMember(item.getUid())}
                    >
                      <Text style={styles.dangerBtnText}>Kick</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              style={{ maxHeight: 250, marginBottom: 15 }}
            />
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowManageMembersModal(false)}
            >
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  chatContainer: {
    flex: 1,
  },
  messageHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    overflow: 'visible',
  },
  headerCallButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupCallButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  messageList: {
    flex: 1,
  },
  messageComposer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0d9488',
    borderRadius: 8,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  headerTitleContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  gatedComposerBanner: {
    padding: 16,
    backgroundColor: '#fef2f2',
    borderTopWidth: 1,
    borderTopColor: '#fee2e2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gatedComposerText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '600',
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
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 6,
  },
  checklistText: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
    marginRight: 10,
  },
  actionBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  dangerBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  dangerBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    marginTop: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
});

export default ChatSimulationScreen;
