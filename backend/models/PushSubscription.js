import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const PushSubscription = sequelize.define('PushSubscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  endpoint: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },
  p256dh: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  auth: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

export default PushSubscription;
