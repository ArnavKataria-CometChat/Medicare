import { User, DoctorProfile, HealthArticle, ActivityLog, NotificationLog, Appointment, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import { sendPush } from '../services/pushService.js';
import { deriveCometChatUid, createCometChatUser, buildUserTags, deactivateCometChatUser, updateCometChatUser } from '../services/cometchatService.js';

// USER MANAGEMENT
export const adminGetUsers = async (req, res, next) => {
  try {
    const { role, search, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    if (role) whereClause.role = role;
    if (status) whereClause.status = status;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      include: [
        { model: DoctorProfile, as: 'doctorProfile' }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      users
    });
  } catch (error) {
    next(error);
  }
};

export const adminCreateUser = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { name, email, password, phone, role, status = 'active', specialization, experienceYears, bio, availabilityHours } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already in use.' });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role,
      status
    }, { transaction });

    if (role === 'DOCTOR') {
      await DoctorProfile.create({
        userId: user.id,
        specialization: specialization || 'General Medicine',
        experienceYears: experienceYears || 0,
        bio: bio || '',
        availabilityHours: availabilityHours || 'Mon-Fri 9am-5pm',
        
        isAvailable: true
      }, { transaction });
    }

    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'ADMIN_USER_CREATE',
      description: `Admin created user ${email} with role ${role}`,
    }, { transaction });

    await transaction.commit();

    const createdUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: DoctorProfile, as: 'doctorProfile' }]
    });

    // CometChat: Create user at account creation time (non-blocking)
    try {
      const uid = deriveCometChatUid(user.id);
      const tags = buildUserTags(role, specialization);
      await createCometChatUser(uid, name, role, tags);
      await User.update({ cometChatUid: uid }, { where: { id: user.id } });
      createdUser.dataValues.cometChatUid = uid;
    } catch (ccError) {
      console.error('[CometChat] Non-blocking sync error during admin user create:', ccError.message);
    }

    res.status(201).json(createdUser);
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

export const adminGetUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{ model: DoctorProfile, as: 'doctorProfile' }]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const adminUpdateUser = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, { transaction });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { name, email, password, phone, role, status, specialization, experienceYears, bio, availabilityHours, isAvailable } = req.body;

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = password; // Hashed by hook
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (status) user.status = status;

    await user.save({ transaction });

    if (user.role === 'DOCTOR') {
      const [profile] = await DoctorProfile.findOrCreate({
        where: { userId: user.id },
        defaults: { specialization: specialization || 'General Medicine' },
        transaction
      });

      if (specialization !== undefined) profile.specialization = specialization;
      if (experienceYears !== undefined) profile.experienceYears = experienceYears;
      if (bio !== undefined) profile.bio = bio;
      if (availabilityHours !== undefined) profile.availabilityHours = availabilityHours;
      
      if (isAvailable !== undefined) profile.isAvailable = isAvailable;

      await profile.save({ transaction });
    }

    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'ADMIN_USER_UPDATE',
      description: `Admin updated user details for ${user.email}`,
    }, { transaction });

    await transaction.commit();

    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: DoctorProfile, as: 'doctorProfile' }]
    });

    // CometChat: Sync updated name/role/tags (non-blocking)
    if (updatedUser.cometChatUid) {
      const updatedTags = buildUserTags(updatedUser.role, updatedUser.doctorProfile?.specialization);
      updateCometChatUser(updatedUser.cometChatUid, {
        name: updatedUser.name,
        role: updatedUser.role,
        tags: updatedTags,
      }).catch((ccError) => {
        console.error('[CometChat] Non-blocking update error:', ccError.message);
      });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

export const adminDeactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.status = 'inactive';
    await user.save({ validate: false });

    // Trigger deactivation notification event
    await NotificationLog.create({
      userId: user.id,
      type: 'app',
      event: 'ACCOUNT_DEACTIVATED',
      status: 'delivered',
      payload: JSON.stringify({ message: 'Your account has been deactivated. Please contact support.' })
    });

    // Send Push Notification in background
    sendPush(user.id, 'Account Deactivated', 'Your account has been deactivated. Please contact support.', '/login').catch(err => console.error('Deactivation push failed:', err.message));

    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'ADMIN_USER_DEACTIVATE',
      description: `Admin deactivated user account: ${user.email}`,
    });

    // CometChat: Deactivate user (non-blocking)
    if (user.cometChatUid) {
      deactivateCometChatUser(user.cometChatUid).catch((ccError) => {
        console.error('[CometChat] Non-blocking deactivation error:', ccError.message);
      });
    }

    res.status(200).json({ message: `User ${user.email} deactivated successfully.` });
  } catch (error) {
    next(error);
  }
};

// ARTICLE MANAGEMENT
export const adminGetArticles = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const whereClause = {};

    if (category) whereClause.category = category;
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const articles = await HealthArticle.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(articles);
  } catch (error) {
    next(error);
  }
};

export const adminCreateArticle = async (req, res, next) => {
  try {
    const { title, category, content, symptoms, prevention, published = false } = req.body;

    if (!title || !category || !content) {
      return res.status(400).json({ error: 'Title, category, and content are required.' });
    }

    const article = await HealthArticle.create({
      title,
      category,
      content,
      symptoms,
      prevention,
      published
    });

    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'ADMIN_ARTICLE_CREATE',
      description: `Admin published health article: ${title}`,
    });

    // Optionally notify all users if published
    if (published) {
      const patients = await User.findAll({ where: { role: 'PATIENT', status: 'active' } });
      const notifications = patients.map(p => ({
        userId: p.id,
        type: 'app',
        event: 'ARTICLE_PUBLISHED',
        status: 'delivered',
        payload: JSON.stringify({ message: `New article: '${title}' is now available in the Health Library.` })
      }));
      await NotificationLog.bulkCreate(notifications);

      // Send Push Notifications to patients in background
      patients.forEach(p => {
        sendPush(p.id, 'New Health Article', `New article: '${title}' is now available in the Health Library.`, `/articles/${article.id}`).catch(err => console.error('Patient article push failed:', err.message));
      });
    }

    res.status(201).json(article);
  } catch (error) {
    next(error);
  }
};

export const adminUpdateArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const article = await HealthArticle.findByPk(id);

    if (!article) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    const { title, category, content, symptoms, prevention, published } = req.body;

    if (title) article.title = title;
    if (category) article.category = category;
    if (content) article.content = content;
    if (symptoms !== undefined) article.symptoms = symptoms;
    if (prevention !== undefined) article.prevention = prevention;
    if (published !== undefined) article.published = published;

    await article.save();

    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'ADMIN_ARTICLE_UPDATE',
      description: `Admin updated health article: ${article.title}`,
    });

    res.status(200).json(article);
  } catch (error) {
    next(error);
  }
};

export const adminDeleteArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const article = await HealthArticle.findByPk(id);

    if (!article) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    await article.destroy();

    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'ADMIN_ARTICLE_DELETE',
      description: `Admin deleted health article: ${article.title}`,
    });

    res.status(200).json({ message: 'Article deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// MONITORING & METRICS
export const adminGetActivities = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: logs } = await ActivityLog.findAndCountAll({
      include: [{ model: User, as: 'user', attributes: ['name', 'email', 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      logs
    });
  } catch (error) {
    next(error);
  }
};

export const adminGetNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: logs } = await NotificationLog.findAndCountAll({
      include: [{ model: User, as: 'user', attributes: ['name', 'email', 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      logs
    });
  } catch (error) {
    next(error);
  }
};

export const adminGetSummary = async (req, res, next) => {
  try {
    const patientCount = await User.count({ where: { role: 'PATIENT' } });
    const doctorCount = await User.count({ where: { role: 'DOCTOR' } });
    const staffCount = await User.count({ where: { role: 'STAFF' } });
    const adminCount = await User.count({ where: { role: 'ADMIN' } });

    const confirmedCount = await Appointment.count({ where: { status: 'confirmed' } });
    const cancelledCount = await Appointment.count({ where: { status: 'cancelled' } });

    const publishedArticles = await HealthArticle.count({ where: { published: true } });
    const draftArticles = await HealthArticle.count({ where: { published: false } });

    const successfulNotifications = await NotificationLog.count({ where: { status: 'delivered' } });
    const failedNotifications = await NotificationLog.count({ where: { status: 'failed' } });

    res.status(200).json({
      users: {
        PATIENT: patientCount,
        DOCTOR: doctorCount,
        STAFF: staffCount,
        ADMIN: adminCount,
        total: patientCount + doctorCount + staffCount + adminCount
      },
      appointments: {
        confirmed: confirmedCount,
        cancelled: cancelledCount,
        total: confirmedCount + cancelledCount
      },
      articles: {
        published: publishedArticles,
        draft: draftArticles,
        total: publishedArticles + draftArticles
      },
      notifications: {
        delivered: successfulNotifications,
        failed: failedNotifications,
        total: successfulNotifications + failedNotifications
      }
    });
  } catch (error) {
    next(error);
  }
};
