import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const AgentMetrics = sequelize.define('AgentMetrics', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  agentUid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  conversationsHandled: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  totalMessages: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  avgResponseTimeMs: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  firstMessageAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  indexes: [
    { unique: true, fields: ['agentUid', 'date'] },
  ],
});

export default AgentMetrics;
