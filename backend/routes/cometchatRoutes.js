import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { User, DoctorProfile } from '../models/index.js';
import { syncUserToCometChat, deriveCometChatUid, generateAuthToken } from '../services/cometchatService.js';

const router = express.Router();

// All CometChat routes require authentication
router.use(authenticateToken);

/**
 * POST /api/cometchat/sync
 *
 * Syncs the current authenticated user to CometChat:
 * - Creates or updates CometChat user with role + tags
 * - Stores cometChatUid on the local User record
 * - Returns an auth token for client SDK initialization
 *
 * Called by the client after login to get a fresh CometChat auth token.
 */
router.post('/sync', async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch full user with doctor profile if applicable
    const user = await User.findByPk(userId, {
      include: [{ model: DoctorProfile, as: 'doctorProfile' }],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    const specialization = user.doctorProfile?.specialization || null;

    // Check if user already has a cometChatUid and just needs a fresh token
    if (user.cometChatUid) {
      const authToken = await generateAuthToken(user.cometChatUid);
      if (authToken) {
        return res.status(200).json({
          cometChatUid: user.cometChatUid,
          authToken,
        });
      }
      // If token generation failed, try full sync below
    }

    // Full sync: create/update CometChat user + generate token
    const result = await syncUserToCometChat(user, specialization);

    if (!result) {
      return res.status(503).json({
        error: 'CometChat service unavailable. Chat features may be limited.',
      });
    }

    // Store cometChatUid if not already stored
    if (!user.cometChatUid) {
      user.cometChatUid = result.uid;
      await user.save();
    }

    res.status(200).json({
      cometChatUid: result.uid,
      authToken: result.authToken,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/cometchat/contacts
 *
 * Returns a role-filtered list of users the current user may chat with.
 * - Patients see doctors they have appointments with (connection required)
 * - Doctors see their patients and peer doctors
 * - Staff see nothing (no messaging access)
 * - Admins see everyone
 *
 * Each contact includes their cometChatUid for SDK-level messaging.
 */
router.get('/contacts', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Staff have no messaging access
    if (userRole === 'STAFF') {
      return res.status(200).json({ contacts: [], total: 0 });
    }

    let whereClause = { status: 'active' };
    let contacts = [];

    if (userRole === 'PATIENT') {
      // Patients see doctors they are connected to (have appointments with accepted chat requests)
      const { Appointment } = await import('../models/index.js');
      const { Op } = await import('sequelize');

      const appointments = await Appointment.findAll({
        where: { patientId: userId, chatRequestStatus: 'accepted' },
        include: [{
          model: DoctorProfile,
          as: 'doctorProfile',
          include: [{
            model: User,
            as: 'user',
            where: {
              status: 'active',
              ...(search ? { name: { [Op.iLike]: `%${search}%` } } : {})
            },
            attributes: ['id', 'name', 'email', 'role', 'cometChatUid']
          }]
        }]
      });

      const doctorMap = new Map();
      appointments.forEach(appt => {
        if (appt.doctorProfile?.user) {
          const u = appt.doctorProfile.user;
          const existing = doctorMap.get(u.id);
          const isActive = appt.status === 'confirmed';
          doctorMap.set(u.id, {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            cometChatUid: u.cometChatUid,
            specialization: appt.doctorProfile.specialization || null,
            
            chatEnded: existing ? (existing.chatEnded && !isActive) : !isActive,
          });
        }
      });
      contacts = Array.from(doctorMap.values());

    } else if (userRole === 'DOCTOR') {
      // Doctors see their connected patients (with accepted chat requests) + all peer doctors
      const { Appointment } = await import('../models/index.js');
      const { Op } = await import('sequelize');

      const doctorProfile = await DoctorProfile.findOne({ where: { userId } });

      // Get connected patients
      let patientContacts = [];
      if (doctorProfile) {
        const appointments = await Appointment.findAll({
          where: { doctorProfileId: doctorProfile.id, chatRequestStatus: 'accepted' },
          include: [{
            model: User,
            as: 'patient',
            where: {
              status: 'active',
              ...(search ? { name: { [Op.iLike]: `%${search}%` } } : {})
            },
            attributes: ['id', 'name', 'email', 'role', 'cometChatUid']
          }]
        });

        const patientMap = new Map();
        appointments.forEach(appt => {
          if (appt.patient) {
            const p = appt.patient;
            const existing = patientMap.get(p.id);
            const isActive = appt.status === 'confirmed';
            patientMap.set(p.id, {
              id: p.id,
              name: p.name,
              email: p.email,
              role: p.role,
              cometChatUid: p.cometChatUid,
              specialization: null,
              
              chatEnded: existing ? (existing.chatEnded && !isActive) : !isActive,
            });
          }
        });
        patientContacts = Array.from(patientMap.values());
      }

      // Get peer doctors (all other doctors)
      const peerDoctors = await User.findAll({
        where: {
          role: 'DOCTOR',
          id: { [Op.ne]: userId },
          status: 'active',
          ...(search ? { name: { [Op.iLike]: `%${search}%` } } : {}),
        },
        attributes: ['id', 'name', 'email', 'role', 'cometChatUid'],
        include: [{
          model: DoctorProfile,
          as: 'doctorProfile',
          attributes: ['specialization'],
        }],
      });

      const peerContacts = peerDoctors.map((d) => ({
        id: d.id,
        name: d.name,
        email: d.email,
        role: d.role,
        cometChatUid: d.cometChatUid,
        specialization: d.doctorProfile?.specialization || null,
        
        chatEnded: false,
      }));

      contacts = [...patientContacts, ...peerContacts];

    } else if (userRole === 'ADMIN') {
      // Admins see all active users
      const { Op } = await import('sequelize');

      const users = await User.findAll({
        where: {
          id: { [Op.ne]: userId },
          status: 'active',
          ...(search ? { name: { [Op.iLike]: `%${search}%` } } : {}),
        },
        attributes: ['id', 'name', 'email', 'role', 'cometChatUid'],
        include: [{
          model: DoctorProfile,
          as: 'doctorProfile',
          attributes: ['specialization'],
          required: false,
        }],
        limit: parseInt(limit),
        offset,
        order: [['name', 'ASC']],
      });

      contacts = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        cometChatUid: u.cometChatUid,
        specialization: u.doctorProfile?.specialization || null,
        
      }));
    }

    res.status(200).json({
      contacts,
      total: contacts.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/cometchat/config
 *
 * Returns the public CometChat configuration needed by the client SDK.
 * Does NOT expose secrets — only appId and region.
 */
router.get('/config', (req, res) => {
  res.status(200).json({
    appId: process.env.COMETCHAT_APP_ID || '',
    region: process.env.COMETCHAT_REGION || '',
  });
});

export default router;
