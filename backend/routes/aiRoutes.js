import express from 'express';
import { processAIChat } from '../controllers/aiController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/chat', authenticateToken, processAIChat);

export default router;
