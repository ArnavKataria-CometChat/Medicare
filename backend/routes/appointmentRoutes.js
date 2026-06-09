import express from 'express';
import { getAppointments, bookAppointment, cancelAppointment } from '../controllers/appointmentController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, requireRole(['PATIENT', 'DOCTOR', 'STAFF']), getAppointments);
router.post('/', authenticateToken, requireRole('PATIENT'), bookAppointment);
router.put('/:id', authenticateToken, requireRole(['PATIENT', 'DOCTOR']), cancelAppointment);

export default router;
