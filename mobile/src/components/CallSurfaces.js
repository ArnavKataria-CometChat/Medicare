/**
 * CallSurfaces.js
 *
 * Root-mounted call overlay component for CometChat voice/video calls.
 * Handles incoming, outgoing, and ongoing call states via dual listeners:
 * - CometChat.addCallListener (SDK socket — incoming calls, cancellations, rejections)
 * - CometChatUIEventHandler.addCallListener (UI events — outgoing initiated, call ended, show ongoing)
 *
 * CRITICAL RULES (from web implementation lessons):
 * - NO onAccept prop on CometChatIncomingCall (kit owns accept path)
 * - CometChatOngoingCall takes sessionID + callSettingsBuilder (NOT a call object)
 * - Full-screen overlay with proper cleanup on call end
 * - Android runtime permissions requested before calls work
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Platform, PermissionsAndroid, AppState, StatusBar } from 'react-native';

let CometChat = null;
let CometChatCalls = null;
let CometChatIncomingCall = null;
let CometChatOutgoingCall = null;
let CometChatOngoingCall = null;
let CometChatUIEventHandler = null;

try {
  CometChat = require('@cometchat/chat-sdk-react-native').CometChat;
  const uikit = require('@cometchat/chat-uikit-react-native');
  CometChatIncomingCall = uikit.CometChatIncomingCall;
  CometChatOutgoingCall = uikit.CometChatOutgoingCall;
  CometChatOngoingCall = uikit.CometChatOngoingCall;
  CometChatUIEventHandler = uikit.CometChatUIEventHandler;
} catch (e) {
  console.warn('[CallSurfaces] CometChat UI Kit not available:', e.message);
}

try {
  CometChatCalls = require('@cometchat/calls-sdk-react-native').CometChatCalls;
} catch (e) {
  console.warn('[CallSurfaces] Calls SDK not available:', e.message);
}

const CALL_LISTENER_ID = 'medicare-call-listener';

/**
 * Request camera + microphone permissions on Android.
 * iOS handles this via Info.plist prompts automatically.
 */
async function requestCallPermissions() {
  if (Platform.OS !== 'android') return true;

  try {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);

    const cameraGranted = grants[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
    const audioGranted = grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;

    if (!cameraGranted || !audioGranted) {
      console.warn('[CallSurfaces] Permissions not fully granted:', grants);
    }

    return cameraGranted && audioGranted;
  } catch (err) {
    console.warn('[CallSurfaces] Permission request error:', err);
    return false;
  }
}

export default function CallSurfaces() {
  const [incomingCall, setIncomingCall] = useState(null);
  const [outgoingCall, setOutgoingCall] = useState(null);
  const [ongoingCallSession, setOngoingCallSession] = useState(null);
  const [callType, setCallType] = useState(null); // 'audio' or 'video'
  const permissionsRequested = useRef(false);
  const transitioningSessionId = useRef(null);

  const incomingCallRef = useRef(null);
  const outgoingCallRef = useRef(null);

  const updateIncomingCall = (val) => {
    incomingCallRef.current = val;
    setIncomingCall(val);
  };

  const updateOutgoingCall = (val) => {
    outgoingCallRef.current = val;
    setOutgoingCall(val);
  };

  // Request permissions on mount (Android)
  useEffect(() => {
    if (!permissionsRequested.current && Platform.OS === 'android') {
      permissionsRequested.current = true;
      requestCallPermissions();
    }
  }, []);

  // Hide status bar on iOS during active call (incoming/outgoing/ongoing)
  const isCallActive = !!(incomingCall || outgoingCall || ongoingCallSession);
  useEffect(() => {
    if (Platform.OS === 'ios') {
      StatusBar.setHidden(isCallActive, 'fade');
    }
    return () => {
      if (Platform.OS === 'ios') {
        StatusBar.setHidden(false, 'fade');
      }
    };
  }, [isCallActive]);

  const transitionToOngoing = (sid, type) => {
    if (!sid) return;
    if (transitioningSessionId.current === sid) {
      console.log('[CallSurfaces] Already transitioning or transitioned to session:', sid);
      return;
    }
    transitioningSessionId.current = sid;

    console.log('[CallSurfaces] Transitioning to ongoing call. Clearing incoming/outgoing overlays first.');
    updateIncomingCall(null);
    updateOutgoingCall(null);

    // Delay mounting ongoing call to avoid native Modal presentation collisions
    setTimeout(() => {
      console.log('[CallSurfaces] Mounting CometChatOngoingCall for session:', sid);
      setOngoingCallSession(sid);
      setCallType(type);
    }, 500);
  };

  const resetCallStates = () => {
    transitioningSessionId.current = null;
    incomingCallRef.current = null;
    outgoingCallRef.current = null;
    setIncomingCall(null);
    setOutgoingCall(null);
    setOngoingCallSession(null);
    setCallType(null);
  };

  useEffect(() => {
    if (!CometChat || !CometChatUIEventHandler) {
      return;
    }

    // SDK socket listener — incoming calls + cancellation/rejection
    CometChat.addCallListener(
      CALL_LISTENER_ID,
      new CometChat.CallListener({
        onIncomingCallReceived: (call) => {
          const sid = call?.getSessionId?.() || call?.sessionId;
          console.log('[CallSurfaces] Incoming call received:', sid);
          updateIncomingCall(call);
        },
        onIncomingCallCancelled: (call) => {
          console.log('[CallSurfaces] Incoming call cancelled');
          resetCallStates();
        },
        onOutgoingCallAccepted: (call) => {
          const sid = call?.getSessionId?.() || call?.sessionId;
          console.log('[CallSurfaces] Outgoing call accepted:', sid);
          // Do nothing. Allow the CometChatOutgoingCall component to transition internally.
        },
        onOutgoingCallRejected: (call) => {
          console.log('[CallSurfaces] Outgoing call rejected');
          resetCallStates();
        },
      })
    );

    // UI Kit event listener — outgoing initiated, call ended, show ongoing
    CometChatUIEventHandler.addCallListener(CALL_LISTENER_ID, {
      ccOutgoingCall: ({ call }) => {
        const sid = call?.getSessionId?.() || call?.sessionId || call?.getData?.()?.sessionId;
        console.log('[CallSurfaces] UI event: outgoing call', sid);
        updateOutgoingCall(call);
        setCallType(call?.getType?.() === 'audio' ? 'audio' : 'video');
      },
      ccCallEnded: () => {
        console.log('[CallSurfaces] UI event: call ended');
        resetCallStates();
      },
      ccCallRejected: () => {
        console.log('[CallSurfaces] UI event: call rejected');
        resetCallStates();
      },
      ccCallFailled: () => {
        // Note: typo "Failled" is from the kit's event name
        console.log('[CallSurfaces] UI event: call failed');
        resetCallStates();
      },
      ccShowOngoingCall: ({ call, sessionId }) => {
        const sid = sessionId || call?.getSessionId?.() || call?.sessionId;
        const type = call?.getType?.() === 'audio' ? 'audio' : 'video';
        console.log('[CallSurfaces] UI event: show ongoing call, sessionId:', sid);
        
        // If we are already in a 1-to-1 incoming/outgoing flow, the component 
        // will handle showing the ongoing call internally. Do not set ongoingCallSession
        // to avoid unmounting the 1-to-1 component and causing native modal collisions.
        if (incomingCallRef.current || outgoingCallRef.current) {
          console.log('[CallSurfaces] 1-to-1 call flow active; allowing native internal transition.');
          return;
        }

        // For group calls or direct sessions, mount CometChatOngoingCall manually
        transitionToOngoing(sid, type);
      },
    });

    return () => {
      CometChat.removeCallListener(CALL_LISTENER_ID);
      CometChatUIEventHandler.removeCallListener(CALL_LISTENER_ID);
    };
  }, []);

  // If SDK components not available, render nothing
  if (!CometChatIncomingCall || !CometChatCalls) {
    return null;
  }

  // Build callSettingsBuilder for ongoing call
  const getCallSettingsBuilder = () => {
    if (!CometChatCalls) return null;
    const builder = new CometChatCalls.CallSettingsBuilder();
    builder.setIsAudioOnlyCall(callType === 'audio');
    return builder;
  };

  return (
    <>
      {/* Incoming call overlay — full screen */}
      {incomingCall && CometChatIncomingCall && (
        <View style={styles.overlay}>
          <CometChatIncomingCall
            call={incomingCall}
            onDecline={() => {
              console.log('[CallSurfaces] User declined incoming call');
              resetCallStates();
            }}
            onError={(error) => {
              console.warn('[CallSurfaces] Incoming call error:', error);
              resetCallStates();
            }}
            // NO onAccept — kit owns the accept path internally
          />
        </View>
      )}

      {/* Outgoing call overlay — full screen */}
      {outgoingCall && CometChatOutgoingCall && !ongoingCallSession && (
        <View style={styles.overlay}>
          <CometChatOutgoingCall
            call={outgoingCall}
            onDecline={() => {
              console.log('[CallSurfaces] User cancelled outgoing call');
              resetCallStates();
            }}
            onError={(error) => {
              console.warn('[CallSurfaces] Outgoing call error:', error);
              resetCallStates();
            }}
          />
        </View>
      )}

      {/* Ongoing call overlay — full screen */}
      {ongoingCallSession && CometChatOngoingCall && (
        <View style={styles.overlay}>
          <CometChatOngoingCall
            sessionID={ongoingCallSession}
            callSettingsBuilder={getCallSettingsBuilder()}
            onError={(error) => {
              console.warn('[CallSurfaces] Ongoing call error:', error);
              resetCallStates();
            }}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
    backgroundColor: '#000000',
  },
});
