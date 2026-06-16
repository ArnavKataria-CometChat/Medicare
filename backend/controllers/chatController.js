import { Message, User, DoctorProfile, Appointment } from '../models/index.js';
import { Op } from 'sequelize';

// Get all conversations for the current user (list of contacts they've messaged)
export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all unique user IDs this user has exchanged messages with
    const sentMessages = await Message.findAll({
      where: { senderId: userId },
      attributes: ['receiverId'],
      group: ['receiverId'],
      raw: true
    });

    const receivedMessages = await Message.findAll({
      where: { receiverId: userId },
      attributes: ['senderId'],
      group: ['senderId'],
      raw: true
    });

    const contactIds = new Set([
      ...sentMessages.map(m => m.receiverId),
      ...receivedMessages.map(m => m.senderId)
    ]);

    // Fetch user details for each contact
    const contacts = await User.findAll({
      where: { id: Array.from(contactIds) },
      attributes: ['id', 'name', 'email', 'role'],
      include: [{
        model: DoctorProfile,
        as: 'doctorProfile',
        attributes: ['specialization', 'imageUrl'],
        required: false
      }]
    });

    // For each contact, get the last message
    const conversations = await Promise.all(contacts.map(async (contact) => {
      const lastMessage = await Message.findOne({
        where: {
          [Op.or]: [
            { senderId: userId, receiverId: contact.id },
            { senderId: contact.id, receiverId: userId }
          ]
        },
        order: [['createdAt', 'DESC']],
        attributes: ['content', 'createdAt', 'senderId', 'read']
      });

      // Count unread messages from this contact
      const unreadCount = await Message.count({
        where: {
          senderId: contact.id,
          receiverId: userId,
          read: false
        }
      });

      return {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        role: contact.role,
        specialization: contact.doctorProfile?.specialization || null,
        imageUrl: contact.doctorProfile?.imageUrl || null,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          time: lastMessage.createdAt,
          isMine: lastMessage.senderId === userId,
        } : null,
        unreadCount
      };
    }));

    // Sort by last message time (most recent first)
    conversations.sort((a, b) => {
      const timeA = a.lastMessage?.time || 0;
      const timeB = b.lastMessage?.time || 0;
      return new Date(timeB) - new Date(timeA);
    });

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
};

// Get messages between current user and a specific user
export const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId } = req.params;
    const { limit = 50, before } = req.query;

    const whereClause = {
      [Op.or]: [
        { senderId: userId, receiverId: contactId },
        { senderId: contactId, receiverId: userId }
      ]
    };

    if (before) {
      whereClause.createdAt = { [Op.lt]: new Date(before) };
    }

    const messages = await Message.findAll({
      where: whereClause,
      order: [['createdAt', 'ASC']],
      limit: parseInt(limit),
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'role'] }
      ]
    });

    // Mark unread messages from the contact as read
    await Message.update(
      { read: true },
      {
        where: {
          senderId: contactId,
          receiverId: userId,
          read: false
        }
      }
    );

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
};

// Get available chat contacts (only from appointments with accepted chat requests)
export const getChatContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let contacts = [];

    if (userRole === 'PATIENT') {
      const appointments = await Appointment.findAll({
        where: { patientId: userId, chatRequestStatus: 'accepted' },
        include: [{
          model: DoctorProfile,
          as: 'doctorProfile',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'role']
          }]
        }]
      });

      const doctorMap = new Map();
      appointments.forEach(appt => {
        if (appt.doctorProfile?.user) {
          const existing = doctorMap.get(appt.doctorProfile.user.id);
          // If any appointment with this doctor is confirmed, mark as active
          const isActive = appt.status === 'confirmed';
          doctorMap.set(appt.doctorProfile.user.id, {
            id: appt.doctorProfile.user.id,
            name: appt.doctorProfile.user.name,
            email: appt.doctorProfile.user.email,
            role: 'DOCTOR',
            specialization: appt.doctorProfile.specialization || null,
            imageUrl: appt.doctorProfile.imageUrl || null,
            chatEnded: existing ? (existing.chatEnded && !isActive) : !isActive,
          });
        }
      });
      contacts = Array.from(doctorMap.values());

    } else if (userRole === 'DOCTOR') {
      const doctorProfile = await DoctorProfile.findOne({ where: { userId } });
      if (doctorProfile) {
        const appointments = await Appointment.findAll({
          where: { doctorProfileId: doctorProfile.id, chatRequestStatus: 'accepted' },
          include: [{
            model: User,
            as: 'patient',
            attributes: ['id', 'name', 'email', 'role']
          }]
        });

        const patientMap = new Map();
        appointments.forEach(appt => {
          if (appt.patient) {
            const existing = patientMap.get(appt.patient.id);
            const isActive = appt.status === 'confirmed';
            patientMap.set(appt.patient.id, {
              id: appt.patient.id,
              name: appt.patient.name,
              email: appt.patient.email,
              role: 'PATIENT',
              specialization: null,
              imageUrl: null,
              chatEnded: existing ? (existing.chatEnded && !isActive) : !isActive,
            });
          }
        });
        contacts = Array.from(patientMap.values());
      }
    }

    res.json(contacts);
  } catch (error) {
    console.error('Error fetching chat contacts:', error);
    res.status(500).json({ error: 'Failed to fetch chat contacts.' });
  }
};

// Send a message (HTTP fallback — mainly used if socket disconnects)
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, content } = req.body;

    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ error: 'receiverId and content are required.' });
    }

    const message = await Message.create({
      senderId,
      receiverId,
      content: content.trim(),
      messageType: 'text'
    });

    const fullMessage = await Message.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'role'] }]
    });

    res.status(201).json(fullMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
};
