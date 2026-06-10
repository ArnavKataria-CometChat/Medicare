import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PushSubscription } from '../models/index.js';

dotenv.config();

let publicKey = process.env.VAPID_PUBLIC_KEY;
let privateKey = process.env.VAPID_PRIVATE_KEY;

if (!publicKey || !privateKey) {
  console.log('VAPID keys not found in environment. Generating new ones...');
  const keys = webpush.generateVAPIDKeys();
  publicKey = keys.publicKey;
  privateKey = keys.privateKey;
  
  // Write/append to .env in backend directory
  const envPath = path.resolve(process.cwd(), '.env');
  const envContent = `\nVAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${privateKey}\n`;
  try {
    fs.appendFileSync(envPath, envContent);
    console.log(`Successfully persisted generated VAPID keys to ${envPath}`);
  } catch (err) {
    console.error('Failed to write VAPID keys to .env:', err.message);
  }
}

webpush.setVapidDetails(
  'mailto:support@medicare.com',
  publicKey,
  privateKey
);

export { publicKey };

export const sendPush = async (userId, title, body, url = '/dashboard') => {
  try {
    const subscriptions = await PushSubscription.findAll({ where: { userId } });
    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, count: 0 };
    }

    const payload = JSON.stringify({
      notification: {
        title,
        body,
        data: { url }
      }
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const subscriptionObj = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(subscriptionObj, payload);
      } catch (err) {
        // If gone (410) or not found (404), clear subscription
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Subscription expired (status ${err.statusCode}). Deleting...`);
          await sub.destroy();
        } else {
          console.error(`Error sending push to endpoint ${sub.endpoint}:`, err.message);
        }
      }
    });

    await Promise.all(sendPromises);
    return { success: true, count: subscriptions.length };
  } catch (error) {
    console.error('Error in sendPush helper:', error);
    return { success: false, error: error.message };
  }
};
