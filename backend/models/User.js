import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcryptjs';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      isValidEmailPattern(value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(value)) {
          throw new Error('Email must match the pattern s@s.a (e.g., user@domain.com).');
        }
      }
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 100],
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isExactTenDigits(value) {
        if (value) {
          const cleanPhone = value.replace(/\D/g, '');
          if (cleanPhone.length !== 10) {
            throw new Error('Phone number must be exactly 10 digits.');
          }
        }
      }
    }
  },
  role: {
    type: DataTypes.ENUM('PATIENT', 'DOCTOR', 'STAFF', 'ADMIN'),
    defaultValue: 'PATIENT',
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
    allowNull: false,
  },
  cometChatUid: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
  },
});

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default User;
