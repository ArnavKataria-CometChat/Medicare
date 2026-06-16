import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { Message, User, NotificationLog, Appointment, DoctorProfile } from '../models/index.js';
import { sendPush } from '../services/pushService.js';
import { sendExpoPush } from '../services/expoPushService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'medicare_super_secret_key_123';

// Track online users: userId -> Set of socket IDs
const onlineUsers = new Map();

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.userName = decoded.name;
      next();
    } catch (err) {
      return next(new Error('Invalid authentication token'));
    }
  });

  // Expose a function to send notifications to users via socket
  const sendSocketNotification = (userId, notification) => {
    io.to(`user:${userId}`).emit('notification:received', notification);
  };

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`[Socket] User connected: ${socket.userName} (${userId})`);

    // Add to online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join a personal room for direct messages
    socket.join(`user:${userId}`);

    // Broadcast online status
    io.emit('user:online', { userId, online: true });

    // Handle sending a message
    socket.on('message:send', async (data, callback) => {
      try {
        const { receiverId, content } = data;

        if (!receiverId || !content?.trim()) {
          if (callback) callback({ error: 'receiverId and content are required' });
          return;
        }

        // Check if chat is allowed (any active appointment with accepted chat between these users)
        const senderDoctorProfile = await DoctorProfile.findOne({ where: { userId } });
        const receiverDoctorProfile = await DoctorProfile.findOne({ where: { userId: receiverId } });
        
        let hasActiveChat = false;
        
        // Check as patient->doctor
        if (receiverDoctorProfile) {
          const appt = await Appointment.findOne({
            where: { patientId: userId, doctorProfileId: receiverDoctorProfile.id, status: 'confirmed', chatRequestStatus: 'accepted' }
          });
          if (appt) hasActiveChat = true;
        }
        // Check as doctor->patient
        if (!hasActiveChat && senderDoctorProfile) {
          const appt = await Appointment.findOne({
            where: { patientId: receiverId, doctorProfileId: senderDoctorProfile.id, status: 'confirmed', chatRequestStatus: 'accepted' }
          });
          if (appt) hasActiveChat = true;
        }

        if (!hasActiveChat) {
          if (callback) callback({ error: 'This chat has ended. No active appointment.' });
          return;
        }

        // Save to database
        const message = await Message.create({
          senderId: userId,
          receiverId,
          content: content.trim(),
          messageType: 'text'
        });

        const fullMessage = await Message.findByPk(message.id, {
          include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'role'] }]
        });

        const messagePayload = {
          id: fullMessage.id,
          senderId: fullMessage.senderId,
          receiverId: fullMessage.receiverId,
          content: fullMessage.content,
          messageType: fullMessage.messageType,
          read: fullMessage.read,
          createdAt: fullMessage.createdAt,
          sender: fullMessage.sender
        };

        // Send to receiver's room (all their devices)
        io.to(`user:${receiverId}`).emit('message:received', messagePayload);

        // Also emit back to sender's other devices
        socket.to(`user:${userId}`).emit('message:received', messagePayload);

        // If recipient is offline, send push notifications
        const recipientOnline = onlineUsers.has(receiverId) && onlineUsers.get(receiverId).size > 0;
        if (!recipientOnline) {
          const senderName = fullMessage.sender?.name || 'Someone';
          const preview = content.trim().length > 80 
            ? content.trim().substring(0, 80) + '...' 
            : content.trim();

          // Web Push (browser)
          sendPush(
            receiverId,
            `💬 ${senderName}`,
            preview,
            '/chats'
          ).catch(err => console.error('[Socket] Web push error:', err));

          // Expo Push (mobile iOS/Android)
          sendExpoPush(
            receiverId,
            `💬 ${senderName}`,
            preview,
            { type: 'chat_message', senderId: userId, senderName }
          ).catch(err => console.error('[Socket] Expo push error:', err));
        }

        // Always persist to NotificationLog so it shows in the notifications panel
        // But only if recipient is NOT currently online (they'd see it in real-time)
        const recipientHasConnection = onlineUsers.has(receiverId) && onlineUsers.get(receiverId).size > 0;
        if (!recipientHasConnection) {
          const notifSenderName = fullMessage.sender?.name || 'Someone';
          const notifPreview = content.trim().length > 100 
            ? content.trim().substring(0, 100) + '...' 
            : content.trim();
          
          NotificationLog.create({
            userId: receiverId,
            type: 'app',
            event: 'CHAT_MESSAGE',
            status: 'delivered',
            payload: JSON.stringify({ 
              message: `${notifSenderName}: ${notifPreview}`,
              senderId: userId,
              senderName: notifSenderName 
            })
          }).catch(err => console.error('[Socket] NotificationLog error:', err));
        }

        // Acknowledge to sender
        if (callback) callback({ success: true, message: messagePayload });
      } catch (error) {
        console.error('[Socket] Error sending message:', error);
        if (callback) callback({ error: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing:start', ({ receiverId }) => {
      io.to(`user:${receiverId}`).emit('typing:start', { userId, userName: socket.userName });
    });

    socket.on('typing:stop', ({ receiverId }) => {
      io.to(`user:${receiverId}`).emit('typing:stop', { userId });
    });

    // Handle marking messages as read
    socket.on('messages:read', async ({ contactId }) => {
      try {
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
        // Notify the contact that their messages were read
        io.to(`user:${contactId}`).emit('messages:read', { userId });
      } catch (error) {
        console.error('[Socket] Error marking messages as read:', error);
      }
    });

    // Get online status of a user
    socket.on('user:status', ({ targetUserId }, callback) => {
      const isOnline = onlineUsers.has(targetUserId) && onlineUsers.get(targetUserId).size > 0;
      if (callback) callback({ online: isOnline });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.userName} (${userId})`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast offline status only when all devices disconnect
          io.emit('user:online', { userId, online: false });
        }
      }
    });
  });

  return { io, sendSocketNotification };
};
