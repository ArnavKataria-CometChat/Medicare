import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const HealthArticle = sequelize.define('HealthArticle', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('diseases', 'nutrition', 'fitness', 'prevention', 'symptoms'),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  symptoms: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  prevention: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
});

export default HealthArticle;
