import { User, DoctorProfile, ActivityLog } from '../models/index.js';
import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'medicare_super_secret_key_123';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email must match the pattern s@s.a (e.g., user@domain.com).' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    let cleanPhone = null;
    if (phone) {
      cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        return res.status(400).json({ error: 'Phone number must be exactly 10 digits.' });
      }
    }

    const existingUser = await User.findOne({ where: { email: { [Op.iLike]: email } } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    // Force PATIENT role for self-registration
    const user = await User.create({
      name,
      email,
      password,
      phone: cleanPhone || null,
      role: 'PATIENT',
      status: 'active',
    });

    const token = generateToken(user);

    await ActivityLog.create({
      userId: user.id,
      activityType: 'REGISTER',
      description: 'User registered account',
      metadata: JSON.stringify({ email: user.email }),
    });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ where: { email: { [Op.iLike]: email } } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Your account is deactivated. Please contact support.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check if the user is attempting admin login via the user login (we allow user login for PATIENT, DOCTOR, STAFF)
    if (user.role === 'ADMIN') {
      return res.status(403).json({ error: 'Administrators must log in via the Admin Portal.' });
    }

    const token = generateToken(user);

    await ActivityLog.create({
      userId: user.id,
      activityType: 'LOGIN',
      description: 'User logged in successfully',
      metadata: JSON.stringify({ role: user.role }),
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ where: { email: { [Op.iLike]: email } } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Only administrators are allowed here.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Admin account is deactivated.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    await ActivityLog.create({
      userId: user.id,
      activityType: 'ADMIN_LOGIN',
      description: 'Administrator logged in successfully',
    });

    res.status(200).json({
      message: 'Admin login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
