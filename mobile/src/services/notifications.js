import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { API_BASE_URL } from './api';

// Configure how notifications appear when app is in foreground
// Wrap in try/catch for Expo Go compatibility
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.log('[Notifications] Handler setup skipped (Expo Go)');
}

/**
 * Register for push notifications and send token to backend
 */
export const registerForPushNotifications = async () => {
  try {
    // Must be a physical device
    if (!Device.isDevice) {
      console.log('[Notifications] Push notifications require a physical device');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return null;
    }

    // Get project ID from Constants
    const projectId = Constants.expoConfig?.extra?.eas?.projectId 
      || Constants.easConfig?.projectId
      || undefined;

    // Get Expo push token
    let pushToken;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId
      });
      pushToken = tokenData.data;
      console.log('[Notifications] Expo push token:', pushToken);
    } catch (tokenError) {
      // In Expo Go (SDK 53+), remote notifications aren't supported
      // Fall back to local notifications only
      console.warn('[Notifications] Could not get push token (Expo Go limitation):', tokenError.message);
      console.log('[Notifications] Local notifications will still work. For remote push, use a development build.');
      return null;
    }

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0d9488',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        description: 'Chat message notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0d9488',
        sound: 'default',
      });
    }

    // Send token to backend
    const authToken = await AsyncStorage.getItem('token');
    if (authToken) {
      await sendTokenToBackend(pushToken, authToken);
    }

    // Store locally for reference
    await AsyncStorage.setItem('expoPushToken', pushToken);

    return pushToken;
  } catch (error) {
    console.error('[Notifications] Error registering:', error);
    return null;
  }
};

/**
 * Send the Expo push token to the backend
 */
const sendTokenToBackend = async (pushToken, authToken) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/notifications/expo-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        token: pushToken,
        platform: Platform.OS
      })
    });

    if (response.ok) {
      console.log('[Notifications] Token registered with backend');
    } else {
      const err = await response.json().catch(() => ({}));
      console.error('[Notifications] Failed to register token:', err);
    }
  } catch (error) {
    console.error('[Notifications] Error sending token to backend:', error);
  }
};

/**
 * Remove push token from backend (call on logout)
 */
export const unregisterPushToken = async () => {
  try {
    const pushToken = await AsyncStorage.getItem('expoPushToken');
    const authToken = await AsyncStorage.getItem('token');

    if (pushToken && authToken) {
      await fetch(`${API_BASE_URL}/api/notifications/expo-token`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ token: pushToken })
      });
    }

    await AsyncStorage.removeItem('expoPushToken');
    console.log('[Notifications] Token unregistered');
  } catch (error) {
    console.error('[Notifications] Error unregistering token:', error);
  }
};
