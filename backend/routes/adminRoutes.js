import express from 'express';
import {
  adminGetUsers,
  adminCreateUser,
  adminGetUserById,
  adminUpdateUser,
  adminDeactivateUser,
  adminGetArticles,
  adminCreateArticle,
  adminUpdateArticle,
  adminDeleteArticle,
  adminGetActivities,
  adminGetNotifications,
  adminGetSummary
} from '../controllers/adminController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Enforce authentication & ADMIN role for all routes in this router
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

// Users
router.get('/users', adminGetUsers);
router.post('/users', adminCreateUser);
router.get('/users/:id', adminGetUserById);
router.put('/users/:id', adminUpdateUser);
router.delete('/users/:id', adminDeactivateUser);

// Articles
router.get('/articles', adminGetArticles);
router.post('/articles', adminCreateArticle);
router.put('/articles/:id', adminUpdateArticle);
router.delete('/articles/:id', adminDeleteArticle);

// Logs & Summary
router.get('/activities', adminGetActivities);
router.get('/notifications', adminGetNotifications);
router.get('/summary', adminGetSummary);

export default router;
