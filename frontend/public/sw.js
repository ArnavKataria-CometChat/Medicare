self.addEventListener('push', (event) => {
  let data = { title: 'MediCare', body: 'New notification received.' };
  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload && payload.notification) {
        data = payload.notification;
      }
    } catch (err) {
      console.log('Push data is not JSON. Using text representation.');
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/favicon.ico', // Fallback icon
    badge: '/favicon.ico', // Fallback badge
    data: {
      url: data.data?.url || '/dashboard'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const clickUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open on our site
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(clickUrl).then((c) => c.focus());
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(clickUrl);
      }
    })
  );
});
