import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { CometChat, CometChatNotifications } from '@cometchat/chat-sdk-javascript';
import { firebaseApp, FIREBASE_VAPID_KEY } from './firebase';

/**
 * Registers the FCM web push token with CometChat.
 * CometChat's backend will then deliver push notifications for new messages/calls
 * through Firebase Cloud Messaging — no self-hosted push server needed.
 *
 * MUST be called AFTER CometChatUIKit.login() resolves (token binds to logged-in user).
 *
 * @param {Function} onForegroundMessage - callback for foreground push payloads (tab focused)
 */
export async function registerFcmWebPush(onForegroundMessage) {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    console.warn('[FCM Push] Browser does not support service workers or notifications.');
    return;
  }

  // Request notification permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('[FCM Push] Notification permission denied.');
    return;
  }

  try {
    // Register the Firebase messaging service worker
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('[FCM Push] Service worker registered:', swRegistration.scope);

    // Get FCM token
    const messaging = getMessaging(firebaseApp);
    const fcmToken = await getToken(messaging, {
      vapidKey: FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (!fcmToken) {
      console.warn('[FCM Push] Failed to get FCM token.');
      return;
    }

    console.log('[FCM Push] FCM token obtained:', fcmToken.substring(0, 20) + '...');

    // Register the token with CometChat using the Notification Engine API
    await CometChatNotifications.registerPushToken(fcmToken, 'fcm_web', 'medicare-89e38');
    console.log('[FCM Push] Token registered with CometChat successfully.');

    // Listen for foreground messages (tab is focused — SW doesn't fire for these)
    if (onForegroundMessage) {
      onMessage(messaging, (payload) => {
        // Only trigger callback if the page is visible (otherwise SW handles it)
        if (document.visibilityState === 'visible') {
          onForegroundMessage(payload);
        }
      });
    }
  } catch (err) {
    console.error('[FCM Push] Registration failed:', err);
  }
}

/**
 * Unregisters the push token from CometChat.
 * Call BEFORE CometChat.logout() while the auth session is still valid.
 */
export async function unregisterFcmWebPush() {
  try {
    if (CometChatNotifications && CometChatNotifications.unregisterPushToken) {
      await CometChatNotifications.unregisterPushToken();
    }
    console.log('[FCM Push] Token unregistered from CometChat.');
  } catch (err) {
    console.warn('[FCM Push] Unregister failed:', err);
  }
}
