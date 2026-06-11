import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getConversations, getMessages, getChatContacts, sendMessage } from '../controllers/chatController.js';

const router = express.Router();

// All chat routes require authentication
router.use(authenticateToken);

// Get all conversations for the logged-in user
router.get('/conversations', getConversations);

// Get available contacts (based on appointments)
router.get('/contacts', getChatContacts);

// Get messages with a specific user
router.get('/messages/:contactId', getMessages);

// Send a message (HTTP fallback)
router.post('/messages', sendMessage);

export default router;
