import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { sequelize } from './models/index.js';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import recordRoutes from './routes/recordRoutes.js';
import articleRoutes from './routes/articleRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { initializeSocket } from './config/socket.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io
const { io, sendSocketNotification } = initializeSocket(server);

// Make socket notification sender available to controllers via app.locals
app.locals.sendSocketNotification = sendSocketNotification;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static('uploads'));

// Serve frontend static build in production
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

// SPA fallback — serve index.html for non-API routes (frontend routing)
app.get('*', (req, res, next) => {
  // Skip API routes and socket.io
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexPath = path.join(publicPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next(); // If file doesn't exist, fall through to 404
  });
});

// Error Handler
app.use(errorHandler);

// Database Sync and Listen
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // Sync models to ensure new columns/tables are created
    await sequelize.sync({ alter: true });
    console.log('Database models synced.');

    server.listen(PORT, () => {
      console.log(`MediCare backend server running on port ${PORT}`);
      console.log(`Socket.io ready for real-time connections`);
    });
  } catch (error) {
    console.error('Unable to connect to database or start server:', error);
    process.exit(1);
  }
};

startServer();
