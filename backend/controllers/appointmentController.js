import { Appointment, User, DoctorProfile, NotificationLog, ActivityLog } from '../models/index.js';

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
    
    // Patient Notification
    await NotificationLog.create({
      userId: patientId,
      type: 'app',
      event: 'APPOINTMENT_BOOKED',
      status: 'delivered',
      payload: JSON.stringify({ message, appointmentId: appointment.id })
    });

    // Doctor Notification
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

    const dateStr = appointment.appointmentDate;
    const timeStr = appointment.appointmentTime;
    const docName = appointment.doctorProfile.user.name;
    const patName = appointment.patient.name;

    const patientMsg = `Your appointment with ${docName} on ${dateStr} at ${timeStr} has been cancelled.`;
    const doctorMsg = `Your appointment with ${patName} on ${dateStr} at ${timeStr} has been cancelled.`;

    // Patient Notification
    await NotificationLog.create({
      userId: appointment.patientId,
      type: 'app',
      event: 'APPOINTMENT_CANCELLED',
      status: 'delivered',
      payload: JSON.stringify({ message: patientMsg, appointmentId: appointment.id })
    });

    // Doctor Notification
    await NotificationLog.create({
      userId: appointment.doctorProfile.user.id,
      type: 'app',
      event: 'APPOINTMENT_CANCELLED',
      status: 'delivered',
      payload: JSON.stringify({ message: doctorMsg, appointmentId: appointment.id })
    });

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
