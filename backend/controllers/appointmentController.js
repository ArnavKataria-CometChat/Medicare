import { Appointment, User, DoctorProfile, NotificationLog, ActivityLog, Message } from '../models/index.js';
import { sendPush } from '../services/pushService.js';
import { sendExpoPush } from '../services/firebasePushService.js';
import { deriveCometChatUid, sendCometChatMessage } from '../services/cometchatService.js';


export const getAppointments = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    let appointments = [];

    if (role === 'PATIENT') {
      appointments = await Appointment.findAll({
        where: { patientId: id },
        include: [
          {
            model: DoctorProfile,
            as: 'doctorProfile',
            include: [{ model: User, as: 'user', attributes: ['name', 'email', 'phone'] }]
          }
        ],
        order: [['appointmentDate', 'ASC'], ['appointmentTime', 'ASC']]
      });
    } else if (role === 'DOCTOR') {
      const doctorProfile = await DoctorProfile.findOne({ where: { userId: id } });
      if (!doctorProfile) {
        return res.status(404).json({ error: 'Doctor profile not found.' });
      }

      appointments = await Appointment.findAll({
        where: { doctorProfileId: doctorProfile.id },
        include: [
          { model: User, as: 'patient', attributes: ['name', 'email', 'phone'] }
        ],
        order: [['appointmentDate', 'ASC'], ['appointmentTime', 'ASC']]
      });
    } else if (role === 'STAFF') {
      // Staff has read-only access to all appointments
      appointments = await Appointment.findAll({
        include: [
          { model: User, as: 'patient', attributes: ['name', 'email', 'phone'] },
          {
            model: DoctorProfile,
            as: 'doctorProfile',
            include: [{ model: User, as: 'user', attributes: ['name', 'email', 'phone'] }]
          }
        ],
        order: [['appointmentDate', 'ASC'], ['appointmentTime', 'ASC']]
      });
    } else {
      return res.status(403).json({ error: 'Unauthorized role access.' });
    }

    res.status(200).json(appointments);
  } catch (error) {
    next(error);
  }
};

export const bookAppointment = async (req, res, next) => {
  try {
    const { doctorProfileId, appointmentDate, appointmentTime, reason } = req.body;
    const patientId = req.user.id;

    if (!doctorProfileId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: 'Doctor profile ID, date, and time are required.' });
    }

    // Date range validation: [tomorrow, 1 month ahead]
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const minDate = new Date(todayDate);
    minDate.setDate(todayDate.getDate() + 1);

    const maxDate = new Date(todayDate);
    maxDate.setMonth(todayDate.getMonth() + 1);

    const chosenDate = new Date(`${appointmentDate}T00:00:00`);

    if (isNaN(chosenDate.getTime())) {
      return res.status(400).json({ error: 'Invalid appointment date format.' });
    }

    if (chosenDate < minDate || chosenDate > maxDate) {
      const minStr = minDate.toISOString().split('T')[0];
      const maxStr = maxDate.toISOString().split('T')[0];
      return res.status(400).json({
        error: `Appointments can only be booked from tomorrow (${minStr}) up to one month in advance (${maxStr}).`
      });
    }

    // 1. Collision check: Doctor + Date + Time
    const collision = await Appointment.findOne({
      where: {
        doctorProfileId,
        appointmentDate,
        appointmentTime,
        status: 'confirmed'
      }
    });

    if (collision) {
      return res.status(400).json({ error: 'The selected time slot is already booked for this doctor. Please choose another slot.' });
    }

    const doctorProfile = await DoctorProfile.findByPk(doctorProfileId, {
      include: [{ model: User, as: 'user', attributes: ['name', 'id'] }]
    });

    if (!doctorProfile) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    // 2. Book appointment
    const appointment = await Appointment.create({
      patientId,
      doctorProfileId,
      appointmentDate,
      appointmentTime,
      reason,
      status: 'confirmed'
    });

    // 3. Create Notification Logs
    const message = `Your appointment with ${doctorProfile.user.name} on ${appointmentDate} at ${appointmentTime} has been confirmed.`;
    
    const sendSocketNotification = req.app.locals.sendSocketNotification;

    // Patient Notification
    if (req.user.id !== patientId) {
      await NotificationLog.create({
        userId: patientId,
        type: 'app',
        event: 'APPOINTMENT_BOOKED',
        status: 'delivered',
        payload: JSON.stringify({ message, appointmentId: appointment.id })
      });
      sendPush(patientId, 'Appointment Confirmed', message, '/appointments').catch(err => console.error('Patient push failed:', err.message));
      sendExpoPush(patientId, 'Appointment Confirmed', message, { type: 'appointment_booked', appointmentId: appointment.id }).catch(err => console.error('Patient expo push failed:', err.message));
      if (sendSocketNotification) {
        sendSocketNotification(patientId, { title: '✅ Appointment Confirmed', body: message, url: '/appointments' });
      }
    }

    // Doctor Notification
    if (req.user.id !== doctorProfile.user.id) {
      await NotificationLog.create({
        userId: doctorProfile.user.id,
        type: 'app',
        event: 'APPOINTMENT_BOOKED',
        status: 'delivered',
        payload: JSON.stringify({
          message: `New appointment booked by Patient: ${req.user.name} on ${appointmentDate} at ${appointmentTime}.`,
          appointmentId: appointment.id
        })
      });
      sendPush(doctorProfile.user.id, 'New Appointment Booked', `New appointment booked by Patient: ${req.user.name} on ${appointmentDate} at ${appointmentTime}.`, '/appointments').catch(err => console.error('Doctor push failed:', err.message));
      sendExpoPush(doctorProfile.user.id, 'New Appointment Booked', `New appointment booked by Patient: ${req.user.name} on ${appointmentDate} at ${appointmentTime}.`, { type: 'appointment_booked', appointmentId: appointment.id }).catch(err => console.error('Doctor expo push failed:', err.message));
      if (sendSocketNotification) {
        sendSocketNotification(doctorProfile.user.id, { title: '📅 New Appointment', body: `New appointment booked by ${req.user.name} on ${appointmentDate} at ${appointmentTime}.`, url: '/appointments' });
      }
    }

    // 4. Log Activity
    await ActivityLog.create({
      userId: patientId,
      activityType: 'APPOINTMENT_BOOK',
      description: `Booked appointment with ${doctorProfile.user.name}`,
      metadata: JSON.stringify({ date: appointmentDate, time: appointmentTime })
    });

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment
    });
  } catch (error) {
    next(error);
  }
};

export const cancelAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findByPk(id, {
      include: [
        { model: User, as: 'patient', attributes: ['name', 'id'] },
        { 
          model: DoctorProfile, 
          as: 'doctorProfile', 
          include: [{ model: User, as: 'user', attributes: ['name', 'id'] }] 
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Security check: Only patient or doctor involved in this appointment can cancel
    const isPatient = req.user.role === 'PATIENT' && appointment.patientId === req.user.id;
    const isDoctor = req.user.role === 'DOCTOR' && appointment.doctorProfile.user.id === req.user.id;

    if (!isPatient && !isDoctor) {
      return res.status(403).json({ error: 'Unauthorized to cancel this appointment.' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ error: 'Appointment is already cancelled.' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    // If chat was accepted, send a system message indicating chat has ended
    if (appointment.chatRequestStatus === 'accepted') {
      await Message.create({
        senderId: req.user.id,
        receiverId: isPatient ? appointment.doctorProfile.user.id : appointment.patientId,
        content: 'This consultation has been cancelled. Chat has ended.',
        messageType: 'system'
      });

      // Send CometChat message
      const doctorUid = deriveCometChatUid(appointment.doctorProfile.user.id);
      const patientUid = deriveCometChatUid(appointment.patientId);
      const senderUid = req.user.role === 'PATIENT' ? patientUid : doctorUid;
      const receiverUid = req.user.role === 'PATIENT' ? doctorUid : patientUid;
      await sendCometChatMessage(
        senderUid,
        receiverUid,
        'This consultation has been cancelled. Chat has ended.'
      ).catch(err => console.error('[CometChat] Failed to send cancel system message:', err));
    }

    const dateStr = appointment.appointmentDate;
    const timeStr = appointment.appointmentTime;
    const docName = appointment.doctorProfile.user.name;
    const patName = appointment.patient.name;

    const patientMsg = `Your appointment with ${docName} on ${dateStr} at ${timeStr} has been cancelled.`;
    const doctorMsg = `Your appointment with ${patName} on ${dateStr} at ${timeStr} has been cancelled.`;

    const sendSocketNotification = req.app.locals.sendSocketNotification;

    // Patient Notification
    if (req.user.id !== appointment.patientId) {
      await NotificationLog.create({
        userId: appointment.patientId,
        type: 'app',
        event: 'APPOINTMENT_CANCELLED',
        status: 'delivered',
        payload: JSON.stringify({ message: patientMsg, appointmentId: appointment.id })
      });
      sendPush(appointment.patientId, 'Appointment Cancelled', patientMsg, '/appointments').catch(err => console.error('Patient push failed:', err.message));
      sendExpoPush(appointment.patientId, 'Appointment Cancelled', patientMsg, { type: 'appointment_cancelled', appointmentId: appointment.id }).catch(err => console.error('Patient expo push failed:', err.message));
      if (sendSocketNotification) {
        sendSocketNotification(appointment.patientId, { title: '❌ Appointment Cancelled', body: patientMsg, url: '/appointments' });
      }
    }

    // Doctor Notification
    if (req.user.id !== appointment.doctorProfile.user.id) {
      await NotificationLog.create({
        userId: appointment.doctorProfile.user.id,
        type: 'app',
        event: 'APPOINTMENT_CANCELLED',
        status: 'delivered',
        payload: JSON.stringify({ message: doctorMsg, appointmentId: appointment.id })
      });
      sendPush(appointment.doctorProfile.user.id, 'Appointment Cancelled', doctorMsg, '/appointments').catch(err => console.error('Doctor push failed:', err.message));
      sendExpoPush(appointment.doctorProfile.user.id, 'Appointment Cancelled', doctorMsg, { type: 'appointment_cancelled', appointmentId: appointment.id }).catch(err => console.error('Doctor expo push failed:', err.message));
      if (sendSocketNotification) {
        sendSocketNotification(appointment.doctorProfile.user.id, { title: '❌ Appointment Cancelled', body: doctorMsg, url: '/appointments' });
      }
    }

    // Log Activity
    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'APPOINTMENT_CANCEL',
      description: `Cancelled appointment on ${dateStr} at ${timeStr}`,
      metadata: JSON.stringify({ appointmentId: appointment.id })
    });

    res.status(200).json({
      message: 'Appointment cancelled successfully',
      appointment
    });
  } catch (error) {
    next(error);
  }
};

export const requestChat = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findByPk(id, {
      include: [
        { model: User, as: 'patient', attributes: ['name', 'id'] },
        { model: DoctorProfile, as: 'doctorProfile', include: [{ model: User, as: 'user', attributes: ['name', 'id'] }] }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    if (appointment.patientId !== req.user.id) {
      return res.status(403).json({ error: 'Only the patient can request a chat.' });
    }

    if (appointment.status !== 'confirmed') {
      return res.status(400).json({ error: 'Can only request chat for confirmed appointments.' });
    }

    if (appointment.chatRequestStatus !== 'none') {
      return res.status(400).json({ error: `Chat request already ${appointment.chatRequestStatus}.` });
    }

    appointment.chatRequestStatus = 'pending';
    await appointment.save();

    const doctorUserId = appointment.doctorProfile.user.id;
    const patientName = appointment.patient.name;
    const message = `${patientName} has requested a chat for the appointment on ${appointment.appointmentDate} at ${appointment.appointmentTime}.`;

    // Notification log
    await NotificationLog.create({
      userId: doctorUserId,
      type: 'app',
      event: 'CHAT_REQUEST',
      status: 'delivered',
      payload: JSON.stringify({ message, appointmentId: appointment.id, patientId: req.user.id })
    });

    // Push notifications
    sendPush(doctorUserId, '💬 Chat Request', message, '/appointments').catch(err => console.error('Push error:', err.message));
    sendExpoPush(doctorUserId, '💬 Chat Request', message, { type: 'chat_request', appointmentId: appointment.id }).catch(err => console.error('Expo push error:', err.message));

    // Socket notification
    const sendSocketNotification = req.app.locals.sendSocketNotification;
    if (sendSocketNotification) {
      sendSocketNotification(doctorUserId, { title: '💬 Chat Request', body: message, url: '/appointments' });
    }

    // Activity log
    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'CHAT_REQUEST',
      description: `Requested chat with ${appointment.doctorProfile.user.name}`,
      metadata: JSON.stringify({ appointmentId: appointment.id })
    });

    res.status(200).json({ message: 'Chat request sent successfully.', appointment });
  } catch (error) {
    next(error);
  }
};

export const acceptChat = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findByPk(id, {
      include: [
        { model: User, as: 'patient', attributes: ['name', 'id'] },
        { model: DoctorProfile, as: 'doctorProfile', include: [{ model: User, as: 'user', attributes: ['name', 'id'] }] }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    if (appointment.doctorProfile.user.id !== req.user.id) {
      return res.status(403).json({ error: 'Only the assigned doctor can accept a chat request.' });
    }

    if (appointment.chatRequestStatus !== 'pending') {
      return res.status(400).json({ error: 'No pending chat request to accept.' });
    }

    appointment.chatRequestStatus = 'accepted';
    await appointment.save();

    const patientId = appointment.patientId;
    const doctorName = appointment.doctorProfile.user.name;
    const message = `${doctorName} has accepted your chat request for the appointment on ${appointment.appointmentDate} at ${appointment.appointmentTime}. You can now start chatting!`;

    // Notification log
    await NotificationLog.create({
      userId: patientId,
      type: 'app',
      event: 'CHAT_ACCEPTED',
      status: 'delivered',
      payload: JSON.stringify({ message, appointmentId: appointment.id, doctorId: req.user.id })
    });

    // Push notifications
    sendPush(patientId, '✅ Chat Accepted', message, '/chats').catch(err => console.error('Push error:', err.message));
    sendExpoPush(patientId, '✅ Chat Accepted', message, { type: 'chat_accepted', appointmentId: appointment.id }).catch(err => console.error('Expo push error:', err.message));

    // Socket notification
    const sendSocketNotification = req.app.locals.sendSocketNotification;
    if (sendSocketNotification) {
      sendSocketNotification(patientId, { title: '✅ Chat Accepted', body: message, url: '/chats' });
    }

    // Activity log
    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'CHAT_ACCEPT',
      description: `Accepted chat request from ${appointment.patient.name}`,
      metadata: JSON.stringify({ appointmentId: appointment.id })
    });

    // Send initial greet message on CometChat on behalf of the doctor
    const doctorUid = deriveCometChatUid(appointment.doctorProfile.user.id);
    const patientUid = deriveCometChatUid(appointment.patientId);
    await sendCometChatMessage(
      doctorUid,
      patientUid,
      `Hello! I have accepted your chat request for our appointment on ${appointment.appointmentDate} at ${appointment.appointmentTime}. How can I help you today?`
    ).catch(err => console.error('[CometChat] Failed to send accept greeting:', err));

    res.status(200).json({ message: 'Chat request accepted.', appointment });
  } catch (error) {
    next(error);
  }
};

export const declineChat = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findByPk(id, {
      include: [
        { model: User, as: 'patient', attributes: ['name', 'id'] },
        { model: DoctorProfile, as: 'doctorProfile', include: [{ model: User, as: 'user', attributes: ['name', 'id'] }] }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    if (appointment.doctorProfile.user.id !== req.user.id) {
      return res.status(403).json({ error: 'Only the assigned doctor can decline a chat request.' });
    }

    if (appointment.chatRequestStatus !== 'pending') {
      return res.status(400).json({ error: 'No pending chat request to decline.' });
    }

    appointment.chatRequestStatus = 'declined';
    await appointment.save();

    const patientId = appointment.patientId;
    const doctorName = appointment.doctorProfile.user.name;
    const message = `${doctorName} has declined your chat request for the appointment on ${appointment.appointmentDate} at ${appointment.appointmentTime}.`;

    // Notification log
    await NotificationLog.create({
      userId: patientId,
      type: 'app',
      event: 'CHAT_DECLINED',
      status: 'delivered',
      payload: JSON.stringify({ message, appointmentId: appointment.id })
    });

    // Push notifications
    sendPush(patientId, '❌ Chat Declined', message, '/appointments').catch(err => console.error('Push error:', err.message));
    sendExpoPush(patientId, '❌ Chat Declined', message, { type: 'chat_declined', appointmentId: appointment.id }).catch(err => console.error('Expo push error:', err.message));

    // Socket notification
    const sendSocketNotification = req.app.locals.sendSocketNotification;
    if (sendSocketNotification) {
      sendSocketNotification(patientId, { title: '❌ Chat Declined', body: message, url: '/appointments' });
    }

    // Activity log
    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'CHAT_DECLINE',
      description: `Declined chat request from ${appointment.patient.name}`,
      metadata: JSON.stringify({ appointmentId: appointment.id })
    });

    res.status(200).json({ message: 'Chat request declined.', appointment });
  } catch (error) {
    next(error);
  }
};
