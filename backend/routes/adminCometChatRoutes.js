import express from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { WebhookLog, CallLog, AgentMetrics, DoctorSession, NotificationLog } from '../models/index.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

// ─── GET /api/admin/webhooks ───────────────────────────────────────────────────
// Paginated, filterable webhook log

router.get('/webhooks', async (req, res, next) => {
  try {
    const { eventType, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (eventType) whereClause.eventType = eventType;
    if (status) whereClause.status = status;

    const { count, rows } = await WebhookLog.findAndCountAll({
      where: whereClause,
      order: [['receivedAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.status(200).json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      webhooks: rows,
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/admin/call-logs ──────────────────────────────────────────────────
// Paginated call log with filters

router.get('/call-logs', async (req, res, next) => {
  try {
    const { status, callType, page = 1, limit = 20, from, to } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (status) whereClause.status = status;
    if (callType) whereClause.callType = callType;
    if (from || to) {
      whereClause.initiatedAt = {};
      if (from) whereClause.initiatedAt[Op.gte] = new Date(from);
      if (to) whereClause.initiatedAt[Op.lte] = new Date(to);
    }

    const { count, rows } = await CallLog.findAndCountAll({
      where: whereClause,
      order: [['initiatedAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.status(200).json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      calls: rows,
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/admin/agent-metrics ──────────────────────────────────────────────
// Agent performance metrics with date range

router.get('/agent-metrics', async (req, res, next) => {
  try {
    const { from, to, agentUid } = req.query;

    const whereClause = {};
    if (agentUid) whereClause.agentUid = agentUid;
    if (from || to) {
      whereClause.date = {};
      if (from) whereClause.date[Op.gte] = from;
      if (to) whereClause.date[Op.lte] = to;
    }

    const metrics = await AgentMetrics.findAll({
      where: whereClause,
      order: [['date', 'DESC'], ['agentUid', 'ASC']],
    });

    // Compute summary
    const summary = {
      totalConversations: 0,
      totalMessages: 0,
      avgResponseTimeMs: null,
      agentCount: new Set(),
    };

    let responseTimes = [];
    for (const m of metrics) {
      summary.totalConversations += m.conversationsHandled;
      summary.totalMessages += m.totalMessages;
      summary.agentCount.add(m.agentUid);
      if (m.avgResponseTimeMs) responseTimes.push(m.avgResponseTimeMs);
    }

    summary.agentCount = summary.agentCount.size;
    summary.avgResponseTimeMs = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;

    res.status(200).json({ metrics, summary });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/admin/doctor-sessions ────────────────────────────────────────────
// Doctor availability / online session history

router.get('/doctor-sessions', async (req, res, next) => {
  try {
    const { doctorUid, from, to, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (doctorUid) whereClause.doctorUid = doctorUid;
    if (from || to) {
      whereClause.onlineAt = {};
      if (from) whereClause.onlineAt[Op.gte] = new Date(from);
      if (to) whereClause.onlineAt[Op.lte] = new Date(to);
    }

    const { count, rows } = await DoctorSession.findAndCountAll({
      where: whereClause,
      order: [['onlineAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    // Current online doctors (sessions without offlineAt)
    const onlineNow = await DoctorSession.count({
      where: { offlineAt: null },
    });

    res.status(200).json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      sessions: rows,
      doctorsOnlineNow: onlineNow,
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/admin/moderation-queue ───────────────────────────────────────────
// Flagged/blocked messages pending review

router.get('/moderation-queue', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {
      eventType: { [Op.in]: ['message_flagged', 'message_blocked'] },
    };
    if (status) whereClause.status = status;

    const { count, rows } = await WebhookLog.findAndCountAll({
      where: whereClause,
      order: [['receivedAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.status(200).json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      items: rows,
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/admin/cometchat-summary ──────────────────────────────────────────
// Real-time dashboard counters (W4)

router.get('/cometchat-summary', async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      messagesToday,
      callsToday,
      activeCallsNow,
      flaggedPending,
      doctorsOnlineNow,
      totalWebhooksReceived,
      cometchatNotificationsToday,
    ] = await Promise.all([
      // Messages today
      WebhookLog.count({
        where: { eventType: 'message_sent', receivedAt: { [Op.gte]: todayStart } },
      }),
      // Calls today
      CallLog.count({
        where: { initiatedAt: { [Op.gte]: todayStart } },
      }),
      // Active calls (initiated or accepted, not ended)
      CallLog.count({
        where: { status: { [Op.in]: ['initiated', 'accepted'] } },
      }),
      // Flagged messages pending
      WebhookLog.count({
        where: { eventType: { [Op.in]: ['message_flagged', 'message_blocked'] }, status: 'processed' },
      }),
      // Doctors currently online
      DoctorSession.count({
        where: { offlineAt: null },
      }),
      // Total webhook events received
      WebhookLog.count(),
      // CometChat notifications today
      NotificationLog.count({
        where: { type: 'cometchat', createdAt: { [Op.gte]: todayStart } },
      }),
    ]);

    res.status(200).json({
      messagesToday,
      callsToday,
      activeCallsNow,
      flaggedPending,
      doctorsOnlineNow,
      totalWebhooksReceived,
      cometchatNotificationsToday,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
