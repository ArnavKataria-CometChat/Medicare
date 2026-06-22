import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const CallLog = sequelize.define('CallLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  initiatorUid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  receiverUid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  callType: {
    type: DataTypes.ENUM('voice', 'video'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('initiated', 'accepted', 'rejected', 'unanswered', 'ended'),
    defaultValue: 'initiated',
    allowNull: false,
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  durationSeconds: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  initiatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
});

export default CallLog;
