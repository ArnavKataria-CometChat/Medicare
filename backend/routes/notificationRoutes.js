import express from 'express';
import { PushSubscription, NotificationLog, User } from '../models/index.js';
import { publicKey } from '../services/pushService.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET public VAPID key
router.get('/vapid-key', authenticateToken, (req, res) => {
  res.status(200).json({ publicKey });
});

// GET user's own notifications (for the NotificationBell)
router.get('/my', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 30;

    const logs = await NotificationLog.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit
    });

    // Count unread (status = 'delivered' and isRead is false or null)
    const unreadCount = logs.filter(l => !l.isRead).length;

    res.status(200).json({
      notifications: logs,
      unreadCount
    });
  } catch (error) {
    next(error);
  }
});

// POST mark all user's notifications as read
router.post('/read-all', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    await NotificationLog.update(
      { isRead: true },
      { where: { userId, isRead: false } }
    );
    res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
});

// POST register push subscription
router.post('/subscribe', authenticateToken, async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Subscription endpoint and keys (p256dh, auth) are required.' });
    }

    // Upsert the subscription record
    const [subscription, created] = await PushSubscription.findOrCreate({
      where: { endpoint },
      defaults: {
        userId: req.user.id,
        p256dh: keys.p256dh,
        auth: keys.auth
      }
    });

    if (!created) {
      // If it exists, update user association and keys
      subscription.userId = req.user.id;
      subscription.p256dh = keys.p256dh;
      subscription.auth = keys.auth;
      await subscription.save();
    }

    res.status(201).json({ message: 'Push subscription registered successfully.' });
  } catch (error) {
    next(error);
  }
});

// POST unregister push subscription
router.post('/unsubscribe', authenticateToken, async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Subscription endpoint is required.' });
    }

    await PushSubscription.destroy({ where: { endpoint, userId: req.user.id } });
    res.status(200).json({ message: 'Push subscription unregistered successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;

