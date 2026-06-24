/* eslint-disable no-restricted-globals */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBxIZfhIs9TSxj_9vuQYJCYDGVeRP3ALKQ',
  authDomain: 'medicare-89e38.firebaseapp.com',
  projectId: 'medicare-89e38',
  storageBucket: 'medicare-89e38.firebasestorage.app',
  messagingSenderId: '599783219960',
  appId: '1:599783219960:web:571815c3d974e3aff3510d',
});

const messaging = firebase.messaging();

// Handle background push from CometChat via FCM
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] Background message received:', payload);

  // CometChat sends data-only messages
  const data = payload.data || {};

  // Suppress background notification for AI Assistant replies
  if (data.sender === 'medicare_ai_assistant' || data.senderName === 'MediCare AI Assistant') {
    console.log('[firebase-messaging-sw] Suppressing background notification for AI agent reply.');
    return;
  }

  const notification = payload.notification || {};

  const title = notification.title || data.title || data.senderName || 'MediCare';
  const body = notification.body || data.alert || data.message || 'You have a new message';

  self.registration.showNotification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.conversationId ? `chat-${data.conversationId}` : `cometchat-${Date.now()}`,
    data: {
      url: '/chats',
      ...data,
    },
  });
});

// Also handle regular VAPID push events (from your existing backend push system)
self.addEventListener('push', (event) => {
  // Skip if this is an FCM message (Firebase SDK handles those via onBackgroundMessage)
  if (event.data) {
    try {
      const payload = event.data.json();
      // FCM messages have a "from" field with the sender ID
      if (payload.from && payload.from.match(/^\d+$/)) {
        // This is an FCM message — let Firebase handle it
        return;
      }
      // This is a VAPID push from our backend
      let data = { title: 'MediCare', body: 'New notification received.' };
      if (payload.notification) {
        data = payload.notification;
      }
      event.waitUntil(
        self.registration.showNotification(data.title, {
          body: data.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          data: { url: data.data?.url || '/dashboard' },
        })
      );
    } catch (err) {
      // Not JSON — show as text
      event.waitUntil(
        self.registration.showNotification('MediCare', {
          body: event.data.text(),
          icon: '/favicon.ico',
          data: { url: '/dashboard' },
        })
      );
    }
  }
});

// Handle notification clicks (works for both FCM and VAPID notifications)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const clickUrl = event.notification.data?.url || '/chats';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(clickUrl).then((c) => c.focus());
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(clickUrl);
      }
    })
  );
});
