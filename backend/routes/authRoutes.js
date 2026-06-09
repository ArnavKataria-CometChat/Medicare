import express from 'express';
import { register, login, adminLogin } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { ActivityLog } from '../models/index.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/admin/login', adminLogin);

router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'LOGOUT',
      description: 'User logged out',
    });
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    next(error);
  }
});

export default router;
