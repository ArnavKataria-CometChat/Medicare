import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ExpoPushToken } from '../models/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin SDK
// Supports: 1) FIREBASE_SERVICE_ACCOUNT env var (JSON string), 2) file on disk
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  const serviceAccountPath = resolve(__dirname, '../config/firebase-service-account.json');
  if (existsSync(serviceAccountPath)) {
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  } else {
    console.warn('[FirebasePush] No service account found. Push notifications will not work.');
    console.warn('[FirebasePush] Set FIREBASE_SERVICE_ACCOUNT env var or place firebase-service-account.json in backend/config/');
  }
}

if (serviceAccount && !getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

/**
 * Send push notification to a user's mobile devices via Firebase Cloud Messaging
 */
export const sendFirebasePush = async (userId, title, body, data = {}) => {
  try {
    if (!getApps().length) {
      console.warn('[FirebasePush] Firebase not initialized. Skipping push.');
      return { success: false, error: 'Firebase not configured' };
    }

    const tokens = await ExpoPushToken.findAll({ where: { userId } });
    if (!tokens || tokens.length === 0) {
      return { success: true, count: 0 };
    }

    const fcmTokens = tokens.map(t => t.token);

    // Build the message payload
    const message = {
      notification: {
        title,
        body
      },
      data: Object.fromEntries(
        Object.entries(data).map(([key, val]) => [key, String(val)])
      ),
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    // Send to each token individually (FCM v1 API)
    const results = await Promise.allSettled(
      fcmTokens.map(async (token) => {
        try {
          await getMessaging().send({ ...message, token });
          return { token, success: true };
        } catch (err) {
          // Remove invalid tokens
          if (
            err.code === 'messaging/registration-token-not-registered' ||
            err.code === 'messaging/invalid-registration-token'
          ) {
            console.log(`[FirebasePush] Removing invalid token: ${token.substring(0, 20)}...`);
            const tokenRecord = tokens.find(t => t.token === token);
            if (tokenRecord) await tokenRecord.destroy();
          } else {
            console.error(`[FirebasePush] Error for token: ${err.code || err.message}`);
          }
          return { token, success: false, error: err.code };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    return { success: true, count: successCount, total: fcmTokens.length };
  } catch (error) {
    console.error('[FirebasePush] Error sending push:', error.message);
    return { success: false, error: error.message };
  }
};

export default getMessaging;

// Backward-compatible alias
export const sendExpoPush = sendFirebasePush;
