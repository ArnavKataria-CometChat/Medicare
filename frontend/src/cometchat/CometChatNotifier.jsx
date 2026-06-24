import { useEffect, useRef } from 'react';
import { CometChat } from '@cometchat/chat-sdk-javascript';

const LISTENER_ID = 'medicare-browser-notifier';

/**
 * CometChatNotifier — Listens for incoming messages and calls via the CometChat SDK
 * and shows in-app toasts when the user isn't actively on /chats.
 *
 * Background notifications (tab not focused / closed) are handled by FCM via
 * firebase-messaging-sw.js — this component only handles foreground in-app toasts.
 *
 * Props:
 * - isReady: boolean — whether CometChat is initialized and logged in
 * - addToast: function(message, type) — from ToastContext
 */
export default function CometChatNotifier({ isReady, addToast }) {
  const currentPathRef = useRef(window.location.pathname);

  // Track current path
  useEffect(() => {
    const update = () => { currentPathRef.current = window.location.pathname; };
    window.addEventListener('popstate', update);
    window.addEventListener('pathchange', update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('pathchange', update);
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    // Message listener — fires for all incoming messages (foreground only)
    CometChat.addMessageListener(
      LISTENER_ID,
      new CometChat.MessageListener({
        onTextMessageReceived: (message) => {
          handleIncomingMessage(message);
        },
        onMediaMessageReceived: (message) => {
          handleIncomingMessage(message, true);
        },
        onCustomMessageReceived: (message) => {
          handleIncomingMessage(message);
        },
      })
    );

    // Call listener — fires for incoming calls (foreground toast supplement)
    CometChat.addCallListener(
      LISTENER_ID,
      new CometChat.CallListener({
        onIncomingCallReceived: (call) => {
          handleIncomingCall(call);
        },
      })
    );

    function handleIncomingMessage(message, isMedia = false) {
      // Don't notify if user is on the chats page (they can see messages directly)
      if (currentPathRef.current === '/chats') return;

      const sender = message.getSender();
      if (sender && sender.getUid() === 'medicare_ai_assistant') {
        return; // Suppress notification for AI Assistant replies
      }

      const senderName = sender?.getName() || 'Someone';
      let body;
      if (isMedia) {
        const type = message.getType();
        body = type === 'image' ? '📷 Sent an image'
          : type === 'video' ? '🎬 Sent a video'
          : type === 'audio' ? '🎵 Sent an audio message'
          : '📎 Sent an attachment';
      } else {
        const text = message.getText?.() || message.getData?.()?.text || 'New message';
        body = text.length > 80 ? text.substring(0, 80) + '...' : text;
      }

      // In-app toast only (background push handled by FCM service worker)
      if (addToast) {
        addToast(`💬 ${senderName}: ${body}`, 'info');
      }
    }

    function handleIncomingCall(call) {
      // Don't toast if on chats page — the CometChatIncomingCall UI is already visible
      if (currentPathRef.current === '/chats') return;

      const caller = call.getCallInitiator();
      const callerName = caller?.getName() || 'Someone';
      const callType = call.getType() === 'video' ? 'video' : 'voice';

      if (addToast) {
        addToast(`📞 Incoming ${callType} call from ${callerName}`, 'info');
      }
    }

    return () => {
      CometChat.removeMessageListener(LISTENER_ID);
      CometChat.removeCallListener(LISTENER_ID);
    };
  }, [isReady, addToast]);

  return null;
}
