import express from 'express';
import { getAppointments, bookAppointment, cancelAppointment, requestChat, acceptChat, declineChat } from '../controllers/appointmentController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, requireRole(['PATIENT', 'DOCTOR', 'STAFF']), getAppointments);
router.post('/', authenticateToken, requireRole('PATIENT'), bookAppointment);
router.put('/:id', authenticateToken, requireRole(['PATIENT', 'DOCTOR']), cancelAppointment);
router.put('/:id/request-chat', authenticateToken, requireRole('PATIENT'), requestChat);
router.put('/:id/accept-chat', authenticateToken, requireRole('DOCTOR'), acceptChat);
router.put('/:id/decline-chat', authenticateToken, requireRole('DOCTOR'), declineChat);

export default router;
