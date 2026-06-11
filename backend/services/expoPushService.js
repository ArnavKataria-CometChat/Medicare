import { ExpoPushToken } from '../models/index.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notification to a user's mobile devices via Expo Push API
 */
export const sendExpoPush = async (userId, title, body, data = {}) => {
  try {
    const tokens = await ExpoPushToken.findAll({ where: { userId } });
    if (!tokens || tokens.length === 0) {
      return { success: true, count: 0 };
    }

    const messages = tokens.map(t => ({
      to: t.token,
      sound: 'default',
      title,
      body,
      data
    }));

    // Expo supports batch sending
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages)
    });

    const result = await response.json();

    // Clean up invalid tokens
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        const ticket = result.data[i];
        if (ticket.status === 'error') {
          if (ticket.details?.error === 'DeviceNotRegistered') {
            // Remove invalid token
            console.log(`[ExpoPush] Removing invalid token: ${tokens[i].token}`);
            await tokens[i].destroy();
          } else {
            console.error(`[ExpoPush] Error for token ${tokens[i].token}:`, ticket.message);
          }
        }
      }
    }

    return { success: true, count: tokens.length };
  } catch (error) {
    console.error('[ExpoPush] Error sending push:', error);
    return { success: false, error: error.message };
  }
};
