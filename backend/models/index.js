import { sequelize } from '../config/database.js';
import User from './User.js';
import DoctorProfile from './DoctorProfile.js';
import Appointment from './Appointment.js';
import HealthArticle from './HealthArticle.js';
import HealthRecord from './HealthRecord.js';
import ActivityLog from './ActivityLog.js';
import NotificationLog from './NotificationLog.js';

// User <-> DoctorProfile (1:1)
User.hasOne(DoctorProfile, { foreignKey: 'userId', as: 'doctorProfile', onDelete: 'CASCADE' });
DoctorProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User (Patient) <-> Appointment (1:M)
User.hasMany(Appointment, { foreignKey: 'patientId', as: 'patientAppointments', onDelete: 'CASCADE' });
Appointment.belongsTo(User, { foreignKey: 'patientId', as: 'patient' });

// DoctorProfile <-> Appointment (1:M)
DoctorProfile.hasMany(Appointment, { foreignKey: 'doctorProfileId', as: 'doctorAppointments', onDelete: 'CASCADE' });
Appointment.belongsTo(DoctorProfile, { foreignKey: 'doctorProfileId', as: 'doctorProfile' });

// User (Patient) <-> HealthRecord (1:M)
User.hasMany(HealthRecord, { foreignKey: 'userId', as: 'healthRecords', onDelete: 'CASCADE' });
HealthRecord.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> ActivityLog (1:M)
User.hasMany(ActivityLog, { foreignKey: 'userId', as: 'activityLogs', onDelete: 'CASCADE' });
ActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> NotificationLog (1:M)
User.hasMany(NotificationLog, { foreignKey: 'userId', as: 'notificationLogs', onDelete: 'CASCADE' });
NotificationLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export {
  sequelize,
  User,
  DoctorProfile,
  Appointment,
  HealthArticle,
  HealthRecord,
  ActivityLog,
  NotificationLog,
};
