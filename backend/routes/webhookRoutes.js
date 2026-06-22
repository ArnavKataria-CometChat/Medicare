import express from 'express';
import crypto from 'crypto';
import { WebhookLog, CallLog, AgentMetrics, DoctorSession, NotificationLog, User } from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();

const WEBHOOK_SECRET = process.env.COMETCHAT_WEBHOOK_SECRET;

// ─── HMAC SIGNATURE VALIDATION ─────────────────────────────────────────────────

/**
 * Validates the x-cometchat-signature header against the request body.
 * Returns 401 if invalid or missing.
 */
function validateSignature(req, res, next) {
  // If no webhook secret configured, skip validation in dev (log warning)
  if (!WEBHOOK_SECRET) {
    console.warn('[Webhook] COMETCHAT_WEBHOOK_SECRET not set. Skipping HMAC validation (dev mode).');
    return next();
  }

  const signature = req.headers['x-cometchat-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature.' });
  }

  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expected) {
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }

  next();
}

// ─── EVENT HANDLERS ────────────────────────────────────────────────────────────

async function handleMessageSent(payload) {
  const data = payload.data || {};
  const senderUid = data.sender?.uid;

  // W5: Write to NOTIFICATION_LOG for push delivery tracking
  if (data.receiver?.uid) {
    const receiverUser = await User.findOne({ where: { cometChatUid: data.receiver.uid } });
    if (receiverUser) {
      await NotificationLog.create({
        userId: receiverUser.id,
        type: 'cometchat',
        event: 'new_message',
        status: 'delivered',
        payload: JSON.stringify({
          senderUid,
          senderName: data.sender?.name,
          preview: typeof data.text === 'string' ? data.text.slice(0, 80) : '[media]',
        }),
      });
    }
  }

  // W7: Track agent metrics if sender has agent role
  if (data.sender?.role === 'staff' && data.sender?.tags?.includes('role:agent')) {
    const today = new Date().toISOString().split('T')[0];
    const [metrics] = await AgentMetrics.findOrCreate({
      where: { agentUid: senderUid, date: today },
      defaults: { agentUid: senderUid, date: today, conversationsHandled: 0, totalMessages: 0 },
    });

    metrics.totalMessages += 1;
    metrics.lastMessageAt = new Date();
    if (!metrics.firstMessageAt) metrics.firstMessageAt = new Date();
    await metrics.save();
  }
}

async function handleCallInitiated(payload) {
  const data = payload.data || {};

  // W2: Create call log entry
  await CallLog.create({
    sessionId: data.sessionId || data.id || `call_${Date.now()}`,
    initiatorUid: data.initiator?.uid || data.sender?.uid || 'unknown',
    receiverUid: data.receiver?.uid || 'unknown',
    callType: data.type === 'audio' ? 'voice' : 'video',
    status: 'initiated',
    initiatedAt: new Date(),
  });
}

async function handleCallAccepted(payload) {
  const data = payload.data || {};
  const sessionId = data.sessionId || data.id;

  if (sessionId) {
    const call = await CallLog.findOne({ where: { sessionId } });
    if (call) {
      call.status = 'accepted';
      call.startedAt = new Date();
      await call.save();
    }
  }
}

async function handleCallRejected(payload) {
  const data = payload.data || {};
  const sessionId = data.sessionId || data.id;

  if (sessionId) {
    const call = await CallLog.findOne({ where: { sessionId } });
    if (call) {
      call.status = 'rejected';
      await call.save();
    }
  }
}

async function handleCallUnanswered(payload) {
  const data = payload.data || {};
  const sessionId = data.sessionId || data.id;

  if (sessionId) {
    const call = await CallLog.findOne({ where: { sessionId } });
    if (call) {
      call.status = 'unanswered';
      await call.save();
    }
  }

  // W2: Trigger missed call notification
  const receiverUid = data.receiver?.uid;
  if (receiverUid) {
    const receiverUser = await User.findOne({ where: { cometChatUid: receiverUid } });
    if (receiverUser) {
      await NotificationLog.create({
        userId: receiverUser.id,
        type: 'cometchat',
        event: 'missed_call',
        status: 'delivered',
        payload: JSON.stringify({
          callerUid: data.initiator?.uid || data.sender?.uid,
          callerName: data.initiator?.name || data.sender?.name || 'Unknown',
          callType: data.type || 'voice',
        }),
      });
    }
  }
}

async function handleCallEnded(payload) {
  const data = payload.data || {};
  const sessionId = data.sessionId || data.id;

  if (sessionId) {
    const call = await CallLog.findOne({ where: { sessionId } });
    if (call) {
      call.status = 'ended';
      call.endedAt = new Date();
      if (call.startedAt) {
        call.durationSeconds = Math.round((call.endedAt - call.startedAt) / 1000);
      }
      await call.save();
    }
  }
}

async function handleMessageFlagged(payload) {
  // W3: Moderation — flagged messages are logged via WEBHOOK_LOG (already written by main handler)
  // Additional moderation queue logic can be added here
}

async function handleMessageBlocked(payload) {
  // W3: Moderation — blocked messages are already in WEBHOOK_LOG
}

async function handleUserBlocked(payload) {
  const data = payload.data || {};
  const blockedUid = data.blockedUser?.uid || data.receiver?.uid;

  if (!blockedUid) return;

  // W6: Check if this user has been blocked by 3+ different users
  const recentBlocks = await WebhookLog.count({
    where: {
      eventType: 'user_blocked',
      payload: { [Op.like]: `%"${blockedUid}"%` },
      receivedAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
    },
  });

  if (recentBlocks >= 3) {
    console.warn(`[Webhook/W6] User ${blockedUid} blocked by 3+ users. Flagging for admin review.`);
    // Create a moderation notification for admin
    const adminUsers = await User.findAll({ where: { role: 'ADMIN', status: 'active' } });
    for (const admin of adminUsers) {
      await NotificationLog.create({
        userId: admin.id,
        type: 'cometchat',
        event: 'user_flagged_multiple_blocks',
        status: 'delivered',
        payload: JSON.stringify({ blockedUid, blockCount: recentBlocks }),
      });
    }
  }
}

async function handleUserOnline(payload) {
  const data = payload.data || {};
  const uid = data.uid || data.user?.uid;
  const tags = data.tags || data.user?.tags || [];

  // W8: Track doctor availability
  if (uid && tags.includes('role:doctor')) {
    await DoctorSession.create({
      doctorUid: uid,
      onlineAt: new Date(),
    });
  }
}

async function handleUserOffline(payload) {
  const data = payload.data || {};
  const uid = data.uid || data.user?.uid;
  const tags = data.tags || data.user?.tags || [];

  // W8: Close the doctor session
  if (uid && tags.includes('role:doctor')) {
    const session = await DoctorSession.findOne({
      where: { doctorUid: uid, offlineAt: null },
      order: [['onlineAt', 'DESC']],
    });

    if (session) {
      session.offlineAt = new Date();
      session.durationMinutes = Math.round((session.offlineAt - session.onlineAt) / 60000);
      await session.save();
    }
  }
}

// ─── EVENT ROUTER ──────────────────────────────────────────────────────────────

const EVENT_HANDLERS = {
  message_sent: handleMessageSent,
  message_flagged: handleMessageFlagged,
  message_blocked: handleMessageBlocked,
  call_initiated: handleCallInitiated,
  call_accepted: handleCallAccepted,
  call_rejected: handleCallRejected,
  call_unanswered: handleCallUnanswered,
  call_ended: handleCallEnded,
  user_blocked: handleUserBlocked,
  user_online: handleUserOnline,
  user_offline: handleUserOffline,
};

// ─── MAIN WEBHOOK ENDPOINT ─────────────────────────────────────────────────────

/**
 * POST /api/webhooks/cometchat
 *
 * Receives CometChat webhook events, validates HMAC signature,
 * writes to WEBHOOK_LOG, routes to event-specific handlers.
 */
router.post('/cometchat', validateSignature, async (req, res) => {
  const payload = req.body;
  const eventType = payload.trigger || payload.event || payload.eventType || 'unknown';
  const eventId = payload.id || payload.eventId || null;

  try {
    // Idempotency check: skip duplicate events
    if (eventId) {
      const existing = await WebhookLog.findOne({ where: { eventId } });
      if (existing) {
        return res.status(200).json({ status: 'duplicate', message: 'Event already processed.' });
      }
    }

    // W1: Write to WEBHOOK_LOG (audit trail)
    const log = await WebhookLog.create({
      eventId,
      source: 'cometchat',
      eventType,
      payload: JSON.stringify(payload),
      status: 'received',
      receivedAt: new Date(),
    });

    // Route to specific handler
    const handler = EVENT_HANDLERS[eventType];
    if (handler) {
      try {
        await handler(payload);
        log.status = 'processed';
      } catch (handlerError) {
        console.error(`[Webhook] Handler error for ${eventType}:`, handlerError);
        log.status = 'failed';
      }
      await log.save();
    } else {
      // Unknown event type — still logged, marked as processed
      log.status = 'processed';
      await log.save();
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[Webhook] Error processing event:', error);
    res.status(500).json({ error: 'Internal server error processing webhook.' });
  }
});

export default router;
