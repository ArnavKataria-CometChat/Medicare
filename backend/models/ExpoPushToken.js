import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ExpoPushToken = sequelize.define('ExpoPushToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  platform: {
    type: DataTypes.ENUM('ios', 'android'),
    allowNull: false,
  },
});

export default ExpoPushToken;
