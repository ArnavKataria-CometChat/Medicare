import { User, DoctorProfile, ActivityLog } from '../models/index.js';
import { Op } from 'sequelize';

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: req.user.role === 'DOCTOR' ? [
        { model: DoctorProfile, as: 'doctorProfile' }
      ] : []
    });

    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { name, phone, password, bio, availabilityHours, specialization, experienceYears, isAvailable } = req.body;

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (password) user.password = password; // Trigger beforeUpdate hook to hash

    await user.save();

    if (user.role === 'DOCTOR') {
      const [profile] = await DoctorProfile.findOrCreate({
        where: { userId: user.id },
        defaults: { specialization: specialization || 'General Medicine' }
      });

      if (bio !== undefined) profile.bio = bio;
      if (availabilityHours !== undefined) profile.availabilityHours = availabilityHours;
      
      if (specialization !== undefined) profile.specialization = specialization;
      if (experienceYears !== undefined) profile.experienceYears = experienceYears;
      if (isAvailable !== undefined) profile.isAvailable = isAvailable;

      await profile.save();
    }

    await ActivityLog.create({
      userId: user.id,
      activityType: 'PROFILE_UPDATE',
      description: 'Updated personal profile details',
    });

    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: user.role === 'DOCTOR' ? [
        { model: DoctorProfile, as: 'doctorProfile' }
      ] : []
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctors = async (req, res, next) => {
  try {
    const { specialization, isAvailable } = req.query;
    const whereClause = {};

    if (specialization) {
      whereClause.specialization = { [Op.iLike]: `%${specialization}%` };
    }

    if (isAvailable !== undefined) {
      whereClause.isAvailable = isAvailable === 'true';
    }

    const doctors = await DoctorProfile.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          where: { status: 'active', role: 'DOCTOR' },
          attributes: ['name', 'email', 'phone', 'status']
        }
      ]
    });

    res.status(200).json(doctors);
  } catch (error) {
    next(error);
  }
};

export const getDoctorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doctor = await DoctorProfile.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          where: { status: 'active' },
          attributes: ['name', 'email', 'phone']
        }
      ]
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    res.status(200).json(doctor);
  } catch (error) {
    next(error);
  }
};
