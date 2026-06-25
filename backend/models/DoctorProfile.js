import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const DoctorProfile = sequelize.define('DoctorProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  specialization: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  experienceYears: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  availabilityHours: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Mon-Sat 10am-7pm',
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
});

export default DoctorProfile;
