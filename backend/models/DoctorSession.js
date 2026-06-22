import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const DoctorSession = sequelize.define('DoctorSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  doctorUid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  onlineAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  offlineAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

export default DoctorSession;
