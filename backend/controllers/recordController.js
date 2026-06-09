import { HealthRecord, User, Appointment, DoctorProfile, NotificationLog, ActivityLog } from '../models/index.js';

export const getMyRecords = async (req, res, next) => {
  try {
    const records = await HealthRecord.findAll({
      where: { userId: req.user.id },
      order: [['uploadedAt', 'DESC']]
    });
    res.status(200).json(records);
  } catch (error) {
    next(error);
  }
};

export const uploadRecord = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a valid document.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    const record = await HealthRecord.create({
      userId: req.user.id,
      fileName: req.file.originalname,
      fileUrl: fileUrl,
      fileType: req.file.mimetype,
      uploadedAt: new Date()
    });

    const msg = `Your health record '${req.file.originalname}' was uploaded successfully.`;

    await NotificationLog.create({
      userId: req.user.id,
      type: 'app',
      event: 'RECORD_UPLOADED',
      status: 'delivered',
      payload: JSON.stringify({ message: msg, recordId: record.id })
    });

    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'RECORD_UPLOAD',
      description: `Uploaded health record: ${req.file.originalname}`,
      metadata: JSON.stringify({ fileType: req.file.mimetype })
    });

    res.status(201).json({
      message: 'Health record uploaded successfully',
      record
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await HealthRecord.findOne({ where: { id, userId: req.user.id } });

    if (!record) {
      return res.status(404).json({ error: 'Health record not found or unauthorized to delete.' });
    }

    await record.destroy();

    await ActivityLog.create({
      userId: req.user.id,
      activityType: 'RECORD_DELETE',
      description: `Deleted health record: ${record.fileName}`,
    });

    res.status(200).json({ message: 'Health record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getPatientRecordsForDoctor = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    
    // Find doctor profile
    const doctorProfile = await DoctorProfile.findOne({ where: { userId: req.user.id } });
    if (!doctorProfile) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    // Verify doctor is connected to patient via at least one appointment (either confirmed or cancelled)
    const connection = await Appointment.findOne({
      where: {
        patientId,
        doctorProfileId: doctorProfile.id
      }
    });

    if (!connection) {
      return res.status(403).json({ error: 'Access denied. You can only view health records for patients who have appointments booked with you.' });
    }

    const records = await HealthRecord.findAll({
      where: { userId: patientId },
      order: [['uploadedAt', 'DESC']]
    });

    res.status(200).json(records);
  } catch (error) {
    next(error);
  }
};
