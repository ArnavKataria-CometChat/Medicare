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
  const permissionsRequested = useRef(false);
  const incomingCallRef = useRef(null);

  const updateIncomingCall = (val) => {
    incomingCallRef.current = val;
    setIncomingCall(val);
  };

  // Request permissions on mount (Android)
  useEffect(() => {
    if (!permissionsRequested.current && Platform.OS === 'android') {
      permissionsRequested.current = true;
      requestCallPermissions();
    }
  }, []);

  // Hide status bar on iOS during active call (incoming call)
  const isCallActive = !!incomingCall;
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

  const resetCallStates = () => {
    incomingCallRef.current = null;
    setIncomingCall(null);
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
        },
        onOutgoingCallRejected: (call) => {
          console.log('[CallSurfaces] Outgoing call rejected');
          resetCallStates();
        },
      })
    );

    // UI Kit event listener — call ended, rejected, failed
    CometChatUIEventHandler.addCallListener(CALL_LISTENER_ID, {
      ccCallEnded: () => {
        console.log('[CallSurfaces] UI event: call ended');
        resetCallStates();
      },
      ccCallRejected: () => {
        console.log('[CallSurfaces] UI event: call rejected');
        resetCallStates();
      },
      ccCallFailled: () => {
        console.log('[CallSurfaces] UI event: call failed');
        resetCallStates();
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
