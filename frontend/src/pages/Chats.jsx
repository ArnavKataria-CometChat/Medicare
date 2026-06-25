import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCometChat } from '../cometchat/CometChatProvider';
import {
  CometChatConversations,
  CometChatMessageList,
  CometChatMessageComposer,
  CometChatMessageHeader,
  CometChatCallButtons,
  CometChatAvatar,
} from '@cometchat/chat-uikit-react';
import { CometChat } from '@cometchat/chat-sdk-javascript';

const Chats = ({ navigate }) => {
  const { user, token } = useAuth();
  const { isReady, cometChatUid } = useCometChat();
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [showContactsPanel, setShowContactsPanel] = useState(false);

  // Group states
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const groupMenuRef = useRef(null);

  // Close group menu dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(e.target)) {
        setShowGroupMenu(false);
      }
    };
    if (showGroupMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showGroupMenu]);



  const toggleMemberSelection = (uid) => {
    setSelectedMembers(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      const guid = 'group_' + Date.now();
      const group = new CometChat.Group(
        guid,
        groupName.trim(),
        CometChat.GROUP_TYPE.PUBLIC,
        ''
      );

      const createdGroup = await CometChat.createGroup(group);
      console.log('[Chats] Group created:', createdGroup);

      if (selectedMembers.length > 0) {
        const membersList = selectedMembers.map(
          (uid) => new CometChat.GroupMember(uid, CometChat.GROUP_MEMBER_SCOPE.PARTICIPANT)
        );
        await CometChat.addMembersToGroup(guid, membersList, []);
      }

      setSelectedGroup(createdGroup);
      setSelectedUser(null);
      const conversation = new CometChat.Conversation(guid, 'group');
      conversation.setConversationWith(createdGroup);
      setSelectedConversation(conversation);

      setGroupName('');
      setSelectedMembers([]);
      setShowCreateGroupModal(false);
    } catch (err) {
      console.error('[Chats] Error creating group:', err);
      alert('Failed to create group: ' + (err.message || err.errorDescription || err));
    }
  };

  const handleAddMember = async (uid) => {
    if (!selectedGroup) return;
    try {
      const membersList = [
        new CometChat.GroupMember(uid, CometChat.GROUP_MEMBER_SCOPE.PARTICIPANT)
      ];
      await CometChat.addMembersToGroup(selectedGroup.getGuid(), membersList, []);
      alert('Member added successfully!');
      setShowAddMemberModal(false);
    } catch (err) {
      console.error('[Chats] Error adding member:', err);
      alert('Failed to add member: ' + (err.message || err.errorDescription || err));
    }
  };

  const fetchGroupMembers = async () => {
    if (!selectedGroup) return;
    try {
      const groupMembersRequest = new CometChat.GroupMembersRequestBuilder(selectedGroup.getGuid())
        .setLimit(100)
        .build();
      const members = await groupMembersRequest.fetchNext();
      setGroupMembers(members || []);
      setShowManageMembersModal(true);
    } catch (err) {
      console.error('[Chats] Error fetching group members:', err);
    }
  };

  const handleRemoveMember = async (uid) => {
    if (!selectedGroup) return;
    try {
      await CometChat.kickGroupMember(selectedGroup.getGuid(), uid);
      setGroupMembers(prev => prev.filter(m => m.getUid() !== uid));
    } catch (err) {
      console.error('[Chats] Error removing member:', err);
      alert('Failed to remove member: ' + (err.message || err.errorDescription || err));
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    if (!window.confirm('Are you sure you want to delete this group? All messages will be permanently lost.')) return;
    try {
      await CometChat.deleteGroup(selectedGroup.getGuid());
      setSelectedGroup(null);
      setSelectedConversation(null);
      alert('Group deleted successfully!');
    } catch (err) {
      console.error('[Chats] Error deleting group:', err);
      alert('Failed to delete group: ' + (err.message || err.errorDescription || err));
    }
  };

  // Fetch appointment-based contacts from our backend
  const fetchContacts = useCallback(async () => {
    if (!token) return;
    setLoadingContacts(true);
    try {
      const res = await fetch('/api/cometchat/contacts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (err) {
      console.error('[Chats] Error fetching contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  }, [token]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Handle conversation selection from CometChat's built-in list
  const handleConversationClick = (conversation) => {
    const conversationWith = conversation.getConversationWith();
    if (conversation.getConversationType() === 'user') {
      if (conversationWith.getUid() === 'medicare_ai_assistant') {
        return;
      }
      setSelectedUser(conversationWith);
      setSelectedGroup(null);
    } else if (conversation.getConversationType() === 'group') {
      setSelectedGroup(conversationWith);
      setSelectedUser(null);
    }
    setSelectedConversation(conversation);
  };

  // Handle clicking a contact from our custom contacts panel
  const handleContactClick = async (contact) => {
    if (!contact.cometChatUid) {
      console.warn('[Chats] Contact has no cometChatUid:', contact.name);
      return;
    }
    try {
      const ccUser = await CometChat.getUser(contact.cometChatUid);
      if (ccUser) {
        const role = ccUser.getRole?.() || ccUser.role || '';
        const name = ccUser.getName?.() || ccUser.name || '';
        const isDoctor = role === 'doctor' || name.toLowerCase().startsWith('dr.');
        const isAIAgent = contact.cometChatUid === 'medicare_ai_assistant';
        
        if (isDoctor || isAIAgent) {
          if (typeof ccUser.setAvatar === 'function') ccUser.setAvatar(undefined);
          ccUser.avatar = undefined;
          if (typeof ccUser.setIcon === 'function') ccUser.setIcon(undefined);
          ccUser.icon = undefined;
          
          if (isDoctor) {
            const cleanName = name.replace(/^dr\.\s+/i, '').trim();
            if (typeof ccUser.setName === 'function') ccUser.setName(cleanName);
            ccUser.name = cleanName;
          } else if (isAIAgent) {
            if (typeof ccUser.setName === 'function') ccUser.setName('AI');
            ccUser.name = 'AI';
          }
        }
      }
      setSelectedUser(ccUser);
      setSelectedGroup(null);
      // Build a conversation object for the message components
      const conversation = new CometChat.Conversation(
        contact.cometChatUid,
        'user',
      );
      conversation.setConversationWith(ccUser);
      setSelectedConversation(conversation);
      setShowContactsPanel(false);
    } catch (err) {
      console.error('[Chats] Error fetching CometChat user:', err);
    }
  };

  // Hide AI Assistant chat from the conversation list
  useEffect(() => {
    const hideAIElement = () => {
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        if (el.textContent?.trim() === 'MediCare AI Assistant') {
          let item = el;
          let found = false;
          while (item && item !== document.body) {
            const className = typeof item.className === 'string' ? item.className : '';
            const tagName = item.tagName.toLowerCase();
            if (
              className.split(' ').some(c => 
                c === 'cometchat-list-item' || 
                c === 'cc-list-item' || 
                c.includes('conversation-list-item') ||
                c.includes('conversations__item')
              ) ||
              tagName === 'li'
            ) {
              found = true;
              break;
            }
            item = item.parentElement;
          }
          
          // Fallback: if we didn't find the exact list-item class, go up 3 levels to match the wrapper
          if (!found) {
            item = el;
            for (let i = 0; i < 3; i++) {
              if (item && item.parentElement && item.parentElement !== document.body) {
                item = item.parentElement;
              }
            }
          }

          if (item && item !== document.body) {
            if (item.style.display !== 'none') {
              item.style.setProperty('display', 'none', 'important');
            }
          }
        }
      });
    };

    hideAIElement();
    
    const interval = setInterval(hideAIElement, 300);
    const observer = new MutationObserver(hideAIElement);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  // Staff users see nothing
  if (user?.role === 'STAFF') {
    return (
      <div style={styles.emptyContainer}>
        <h3 style={styles.emptyTitle}>Chat Unavailable</h3>
        <p style={styles.emptyText}>Staff accounts do not have messaging access.</p>
      </div>
    );
  }

  // Not ready yet — show loading
  if (!isReady) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.spinner} />
        <p style={styles.emptyText}>Connecting to chat...</p>
      </div>
    );
  }



  const isDoctorUser = user?.role === 'DOCTOR';

  return (
    <div style={styles.container}>
      {/* Left pane: Conversations list */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>Messages</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isDoctorUser && (
              <button
                style={styles.newChatBtn}
                onClick={() => setShowCreateGroupModal(true)}
                title="Create Group Chat"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </button>
            )}
            <button
              style={styles.newChatBtn}
              onClick={() => setShowContactsPanel(!showContactsPanel)}
              title="Start new conversation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
          </div>
        </div>

        {showContactsPanel ? (
          /* Custom contacts panel — appointment-based contacts from our backend */
          <div style={styles.contactsPanel}>
            <div style={styles.contactsPanelHeader}>
              <span style={styles.contactsPanelTitle}>Your Contacts</span>
              <button
                style={styles.contactsBackBtn}
                onClick={() => setShowContactsPanel(false)}
              >
                ← Back
              </button>
            </div>
            {loadingContacts ? (
              <div style={styles.loadingBox}>Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div style={styles.loadingBox}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  {user?.role === 'PATIENT'
                    ? 'Book an appointment with a doctor to start chatting'
                    : 'Your patients will appear here once they book appointments'}
                </p>
              </div>
            ) : (
              <div style={styles.contactsList}>
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    style={styles.contactItem}
                    onClick={() => handleContactClick(contact)}
                  >
                    <div style={styles.contactAvatar}>
                      {getInitials(contact.name)}
                    </div>
                    <div style={styles.contactInfo}>
                      <p style={styles.contactName}>{contact.name}</p>
                      <p style={styles.contactSub}>
                        {contact.specialization || contact.role?.toLowerCase()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* CometChat built-in conversation list with real-time updates */
          <div style={styles.conversationsList}>
            <CometChatConversations
              onItemClick={handleConversationClick}
              activeConversation={selectedConversation}
              headerView={<></>}
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

                            if (isDoctor || isAIAgent || isGroup) {
                              if (typeof conversationWith.setAvatar === 'function') conversationWith.setAvatar(undefined);
                              conversationWith.avatar = undefined;
                              if (typeof conversationWith.setIcon === 'function') conversationWith.setIcon(undefined);
                              conversationWith.icon = undefined;

                              if (isDoctor) {
                                const cleanName = name.replace(/^dr\.\s+/i, '').trim();
                                if (typeof conversationWith.setName === 'function') conversationWith.setName(cleanName);
                                conversationWith.name = cleanName;
                              } else if (isAIAgent) {
                                if (typeof conversationWith.setName === 'function') conversationWith.setName('AI');
                                conversationWith.name = 'AI';
                              }
                            }
                          }
                        });

                        return conversations.filter(conv => {
                          const conversationWith = conv.getConversationWith();
                          if (conv.getConversationType() === 'user' && conversationWith) {
                            return conversationWith.getUid() !== 'medicare_ai_assistant';
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
          </div>
        )}
      </div>

      {/* Right pane: Active chat */}
      <div style={styles.mainPanel}>
          {!selectedUser && !selectedGroup ? (
          <div style={styles.emptyContainer}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h3 style={styles.emptyTitle}>Select a conversation</h3>
            <p style={styles.emptyText}>
              Choose a contact from the sidebar to start messaging. Messages are delivered in real-time with typing indicators and read receipts.
            </p>
          </div>
        ) : (() => {
          if (selectedUser && selectedUser.getUid() === 'medicare_ai_assistant') {
            return (
              <div style={styles.emptyContainer}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <h3 style={styles.emptyTitle}>Select a conversation</h3>
                <p style={styles.emptyText}>
                  Choose a contact from the sidebar to start messaging. Messages are delivered in real-time with typing indicators and read receipts.
                </p>
              </div>
            );
          }
          if (selectedGroup) {
            return (
              <div style={styles.chatArea}>
                <div style={styles.messageHeader}>
                  <CometChatMessageHeader
                    group={selectedGroup}
                    hideVideoCallButton={true}
                    hideVoiceCallButton={true}
                  />
                  {selectedGroup && (
                    <div style={styles.groupActions}>
                      <CometChatCallButtons
                        group={selectedGroup}
                        {...(!isDoctorUser && { hideVideoCallButton: true, hideVoiceCallButton: true })}
                      />
                      {selectedGroup.getOwner() === cometChatUid && (
                        <div ref={groupMenuRef} style={styles.dropdownContainer}>
                          <button style={styles.actionBtn} onClick={() => setShowGroupMenu(!showGroupMenu)}>
                            Options ▾
                          </button>
                          {showGroupMenu && (
                            <div style={styles.dropdownMenu}>
                              <button
                                style={styles.dropdownItem}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                onClick={() => { setShowGroupMenu(false); setShowAddMemberModal(true); }}
                              >
                                Add Member
                              </button>
                              <button
                                style={styles.dropdownItem}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                onClick={() => { setShowGroupMenu(false); fetchGroupMembers(); }}
                              >
                                Manage Members
                              </button>
                              <div style={styles.dropdownDivider}></div>
                              <button
                                style={styles.dropdownDeleteItem}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                onClick={() => { setShowGroupMenu(false); handleDeleteGroup(); }}
                              >
                                Delete Group
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Mobile back button */}
                  <button
                    style={styles.mobileBackBtn}
                    onClick={() => {
                      setSelectedGroup(null);
                      setSelectedConversation(null);
                    }}
                  >
                    ←
                  </button>
                </div>

                <div style={styles.messageList}>
                  <CometChatMessageList
                    group={selectedGroup}
                    messagesRequestBuilder={(() => {
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
                                    if (typeof sender.setAvatar === 'function') sender.setAvatar(undefined);
                                    sender.avatar = undefined;
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
                </div>

                <div style={styles.messageComposer}>
                  <CometChatMessageComposer group={selectedGroup} />
                </div>
              </div>
            );
          }

          const isPatientDoctorChat = selectedUser
            ? ((user?.role === 'PATIENT' && selectedUser.getRole() === 'doctor') ||
               (user?.role === 'DOCTOR' && selectedUser.getRole() === 'patient'))
            : false;
          const matchedContact = selectedUser
            ? contacts.find(c => c.id === selectedUser.getUid() || c.cometChatUid === selectedUser.getUid())
            : null;
          const isChatAllowed = !isPatientDoctorChat || (matchedContact && !matchedContact.chatEnded);

          return (
            <div style={styles.chatArea}>
              {/* Message header — shows name, presence, and call buttons */}
              <div style={styles.messageHeader}>
                <CometChatMessageHeader
                  user={selectedUser}
                  {...((!isDoctorUser || !isChatAllowed) && { hideVideoCallButton: true, hideVoiceCallButton: true })}
                />
                {/* Mobile back button */}
                <button
                  style={styles.mobileBackBtn}
                  onClick={() => {
                    setSelectedUser(null);
                    setSelectedConversation(null);
                  }}
                >
                  ←
                </button>
              </div>

              {/* Message list */}
              <div style={styles.messageList}>
                <CometChatMessageList
                  user={selectedUser}
                  messagesRequestBuilder={(() => {
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
                                  if (typeof sender.setAvatar === 'function') sender.setAvatar(undefined);
                                  sender.avatar = undefined;
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
              </div>

              {/* Message composer */}
              {isChatAllowed ? (
                <div style={styles.messageComposer}>
                  <CometChatMessageComposer user={selectedUser} />
                </div>
              ) : (
                <div style={styles.gatedComposerBanner}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>This consultation chat is closed or request is pending.</span>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Modals */}
      {showCreateGroupModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Create Group Chat</h3>
            <form onSubmit={handleCreateGroup}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Group Name</label>
                <input
                  type="text"
                  style={styles.formInput}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Cardiology Discussion"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Select Members (Doctors & Patients)</label>
                <div style={styles.membersChecklist}>
                  {contacts.map((contact) => (
                    <label key={contact.id} style={styles.checklistLabel}>
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(contact.cometChatUid)}
                        onChange={() => toggleMemberSelection(contact.cometChatUid)}
                        style={{ marginRight: '8px' }}
                      />
                      <span>{contact.name} ({contact.specialization || contact.role?.toLowerCase()})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.modalActions}>
                <button type="button" style={styles.modalCancelBtn} onClick={() => { setShowCreateGroupModal(false); setSelectedMembers([]); setGroupName(''); }}>Cancel</button>
                <button type="submit" style={styles.modalSubmitBtn}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddMemberModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Add Member to Group</h3>
            <div style={styles.membersChecklist}>
              {contacts.map((contact) => (
                <div key={contact.id} style={styles.checklistRow}>
                  <span>{contact.name}</span>
                  <button
                    style={styles.actionBtn}
                    onClick={() => handleAddMember(contact.cometChatUid)}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
            <div style={styles.modalActions}>
              <button style={styles.modalCancelBtn} onClick={() => setShowAddMemberModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showManageMembersModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Manage Group Members</h3>
            <div style={styles.membersChecklist}>
              {groupMembers.map((member) => (
                <div key={member.getUid()} style={styles.checklistRow}>
                  <span>{member.getName()} ({member.getRole()})</span>
                  {member.getUid() !== cometChatUid && (
                    <button
                      style={styles.dangerBtn}
                      onClick={() => handleRemoveMember(member.getUid())}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div style={styles.modalActions}>
              <button style={styles.modalCancelBtn} onClick={() => setShowManageMembersModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '?';
  const parts = name.replace(/^dr\.\s+/i, '').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = {
  container: {
    position: 'fixed',
    top: '60px',
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    background: '#f8fafc',
    zIndex: 50,
    fontFamily: 'var(--font-primary)',
  },
  sidebar: {
    width: '340px',
    background: 'white',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '1rem 1.25rem',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sidebarTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  newChatBtn: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    border: 'none',
    background: '#f1f5f9',
    color: '#334155',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
  },
  conversationsList: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  contactsPanel: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  contactsPanelHeader: {
    padding: '0.75rem 1.25rem',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactsPanelTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#334155',
  },
  contactsBackBtn: {
    background: 'none',
    border: 'none',
    color: '#0d9488',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  contactsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.5rem',
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    marginBottom: '2px',
  },
  contactAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #0d9488, #0f766e)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.85rem',
    flexShrink: 0,
  },
  contactInfo: {
    flex: 1,
    minWidth: 0,
  },
  contactName: {
    fontSize: '0.88rem',
    fontWeight: 600,
    color: '#0f172a',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  contactSub: {
    fontSize: '0.75rem',
    color: '#64748b',
    margin: '2px 0 0 0',
  },
  loadingBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    color: '#64748b',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
  mainPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'white',
    minWidth: 0,
    overflow: 'hidden',
  },
  emptyContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    gap: '1rem',
    padding: '2rem',
  },
  emptyTitle: {
    fontSize: '1.1rem',
    color: '#334155',
    margin: 0,
  },
  emptyText: {
    fontSize: '0.85rem',
    maxWidth: '320px',
    textAlign: 'center',
    lineHeight: 1.5,
    margin: 0,
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #0d9488',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0,
  },
  messageHeader: {
    borderBottom: '1px solid #e2e8f0',
    position: 'relative',
  },
  messageList: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  messageComposer: {
    borderTop: '1px solid #e2e8f0',
  },
  mobileBackBtn: {
    position: 'absolute',
    left: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#0d9488',
    fontSize: '1.2rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'none', // shown via media query
  },
  gatedComposerBanner: {
    padding: '1.25rem',
    background: '#fef2f2',
    color: '#b91c1c',
    borderTop: '1px solid #fee2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
    fontWeight: 600,
    gap: '0.5rem',
  },
  groupActions: {
    position: 'absolute',
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    gap: '8px',
    zIndex: 10,
    alignItems: 'center',
  },
  dropdownContainer: {
    position: 'relative',
    display: 'inline-block',
  },
  dropdownMenu: {
    position: 'absolute',
    right: 0,
    top: '35px',
    background: 'white',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    zIndex: 100,
    minWidth: '150px',
    display: 'flex',
    flexDirection: 'column',
    padding: '4px 0',
  },
  dropdownItem: {
    padding: '8px 12px',
    background: 'none',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    fontSize: '0.8rem',
    color: '#334155',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  dropdownDeleteItem: {
    padding: '8px 12px',
    background: 'none',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    fontSize: '0.8rem',
    color: '#991b1b',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  dropdownDivider: {
    height: '1px',
    background: '#e2e8f0',
    margin: '4px 0',
  },
  actionBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    background: 'white',
    color: '#0f172a',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  dangerBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #fee2e2',
    background: '#fef2f2',
    color: '#991b1b',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'white',
    borderRadius: '12px',
    width: '450px',
    maxWidth: '90%',
    padding: '24px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 16px 0',
  },
  formGroup: {
    marginBottom: '16px',
  },
  formLabel: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '6px',
  },
  formInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  membersChecklist: {
    maxHeight: '200px',
    overflowY: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  checklistLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.85rem',
    color: '#334155',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background 0.2s',
  },
  checklistRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: '#334155',
    padding: '6px 8px',
    borderRadius: '6px',
    background: '#f8fafc',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '20px',
  },
  modalCancelBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    background: 'white',
    color: '#334155',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  modalSubmitBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    background: '#0d9488',
    color: 'white',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default Chats;
