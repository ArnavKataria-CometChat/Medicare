import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  doctorProfileId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  appointmentDate: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  appointmentTime: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('confirmed', 'cancelled'),
    defaultValue: 'confirmed',
    allowNull: false,
  },
  chatRequestStatus: {
    type: DataTypes.ENUM('none', 'pending', 'accepted', 'declined'),
    defaultValue: 'none',
    allowNull: false,
  },
});

export default Appointment;
