import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { getMyRecords, uploadRecord, deleteRecord, getPatientRecordsForDoctor } from '../controllers/recordController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.get('/', authenticateToken, requireRole('PATIENT'), getMyRecords);
router.post('/', authenticateToken, requireRole('PATIENT'), upload.single('file'), uploadRecord);
router.delete('/:id', authenticateToken, requireRole('PATIENT'), deleteRecord);
router.get('/patient/:patientId', authenticateToken, requireRole('DOCTOR'), getPatientRecordsForDoctor);

export default router;
