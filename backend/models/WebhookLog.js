import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const WebhookLog = sequelize.define('WebhookLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  eventId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  source: {
    type: DataTypes.STRING,
    defaultValue: 'cometchat',
    allowNull: false,
  },
  eventType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  payload: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('received', 'processed', 'failed'),
    defaultValue: 'received',
    allowNull: false,
  },
  receivedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
});

export default WebhookLog;
