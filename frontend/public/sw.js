// This service worker is deprecated.
// All push handling is now in firebase-messaging-sw.js
// This file exists to unregister old SW registrations.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
