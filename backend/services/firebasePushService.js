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
/**
 * Send push notification to a user's mobile devices, routing dynamically to Expo or FCM
 */
export const sendExpoPush = async (userId, title, body, data = {}) => {
  try {
    const tokens = await ExpoPushToken.findAll({ where: { userId } });
    if (!tokens || tokens.length === 0) {
      return { success: true, count: 0 };
    }

    const expoTokens = [];
    const nativeTokens = [];

    tokens.forEach(t => {
      const tokenStr = t.token || '';
      if (tokenStr.startsWith('ExponentPushToken') || tokenStr.startsWith('ExpoPushToken')) {
        expoTokens.push(t);
      } else {
        nativeTokens.push(t);
      }
    });

    let successCount = 0;

    // 1. Dispatch Expo tokens using Expo's Push service
    if (expoTokens.length > 0) {
      const expoMessages = expoTokens.map(t => ({
        to: t.token,
        sound: 'default',
        title,
        body,
        data
      }));

      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(expoMessages)
        });

        const result = await response.json();
        if (result.data) {
          for (let i = 0; i < result.data.length; i++) {
            const ticket = result.data[i];
            if (ticket.status === 'ok') {
              successCount++;
            } else if (ticket.status === 'error') {
              if (ticket.details?.error === 'DeviceNotRegistered') {
                console.log(`[ExpoPush] Removing invalid token: ${expoTokens[i].token}`);
                await expoTokens[i].destroy();
              } else {
                console.error(`[ExpoPush] Error for token ${expoTokens[i].token}:`, ticket.message);
              }
            }
          }
        }
      } catch (expoErr) {
        console.error('[PushRouting] Expo push error:', expoErr.message);
      }
    }

    // 2. Dispatch native tokens via Firebase Cloud Messaging (if configured)
    if (nativeTokens.length > 0) {
      if (getApps().length) {
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

        const results = await Promise.allSettled(
          nativeTokens.map(async (t) => {
            try {
              await getMessaging().send({ ...message, token: t.token });
              successCount++;
              return { token: t.token, success: true };
            } catch (err) {
              if (
                err.code === 'messaging/registration-token-not-registered' ||
                err.code === 'messaging/invalid-registration-token'
              ) {
                console.log(`[FirebasePush] Removing invalid token: ${t.token.substring(0, 20)}...`);
                await t.destroy();
              } else {
                console.error(`[FirebasePush] Error for token: ${err.code || err.message}`);
              }
              return { token: t.token, success: false, error: err.code };
            }
          })
        );
      } else {
        console.warn('[FirebasePush] Native tokens registered but Firebase not initialized. Skipping native push.');
      }
    }

    return { success: true, count: successCount, total: tokens.length };
  } catch (error) {
    console.error('[PushRouting] Error routing push:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendFirebasePush = sendExpoPush;

export default getMessaging;
