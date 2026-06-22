function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks whether push notifications are currently subscribed.
 * Returns the subscription object or null.
 */
export const getExistingSubscription = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (!registration) return null;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch {
    return null;
  }
};

/**
 * Checks if the browser's Notification permission is granted.
 */
export const isPushPermissionGranted = () => {
  if (!('Notification' in window)) return false;
  return Notification.permission === 'granted';
};

/**
 * Checks if the browser can support push at all.
 */
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

/**
 * Subscribes the user to push notifications.
 * This MUST be called from a user-gesture handler (click, tap, etc.)
 * because browsers require a user gesture to show the Notification permission prompt.
 */
export const subscribeUserToPush = async (token) => {
  if (!isPushSupported()) {
    console.warn('Push notifications are not supported in this browser.');
    return { success: false, reason: 'unsupported' };
  }

  try {
    // 1. Register Service Worker (idempotent) — use the Firebase messaging SW for all push
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Service Worker registered:', registration.scope);

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    // 2. Request Notification Permission (requires user gesture)
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied by user.');
      return { success: false, reason: 'denied' };
    }

    // 3. Fetch VAPID Key from backend
    const vapidRes = await fetch('/api/notifications/vapid-key', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!vapidRes.ok) {
      throw new Error(`Failed to fetch VAPID key (HTTP ${vapidRes.status})`);
    }
    const { publicKey } = await vapidRes.json();
    const convertedVapidKey = urlBase64ToUint8Array(publicKey);

    // 4. Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Verify the existing subscription uses the same application server key
      // If keys mismatch, unsubscribe and re-subscribe
      try {
        const existingKey = subscription.options?.applicationServerKey;
        if (existingKey) {
          const existingKeyArr = new Uint8Array(existingKey);
          const keysMatch = existingKeyArr.length === convertedVapidKey.length &&
            existingKeyArr.every((v, i) => v === convertedVapidKey[i]);
          if (!keysMatch) {
            console.log('VAPID key changed, re-subscribing...');
            await subscription.unsubscribe();
            subscription = null;
          }
        }
      } catch (e) {
        console.warn('Could not verify existing subscription key:', e);
      }
    }

    if (!subscription) {
      // Subscribe the user via PushManager
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
      console.log('New push subscription created.');
    } else {
      console.log('Using existing push subscription.');
    }

    // 5. Send subscription info to backend
    const subJson = subscription.toJSON();
    const subscribeRes = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: subJson.keys
      })
    });

    if (subscribeRes.ok) {
      console.log('Push subscription saved on backend.');
      return { success: true };
    } else {
      const errData = await subscribeRes.json().catch(() => ({}));
      console.error('Failed to save push subscription on backend:', errData);
      return { success: false, reason: 'backend_error' };
    }
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return { success: false, reason: error.message };
  }
};

/**
 * Unsubscribes the user from push notifications.
 */
export const unsubscribeUserFromPush = async (token) => {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;

    // Unsubscribe from browser
    await subscription.unsubscribe();

    // Unsubscribe from backend
    await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ endpoint })
    });

    console.log('Push subscription removed.');
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
  }
};
