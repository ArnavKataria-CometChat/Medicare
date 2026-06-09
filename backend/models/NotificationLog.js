import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const NotificationLog = sequelize.define('NotificationLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'app',
    allowNull: false,
  },
  event: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('sent', 'delivered', 'failed'),
    defaultValue: 'sent',
    allowNull: false,
  },
  payload: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

export default NotificationLog;
