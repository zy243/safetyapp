import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database.js'; // Sequelize instance

class User extends Model {
    // Compare plaintext password with hashed password
    async comparePassword(candidatePassword) {
        return bcrypt.compare(candidatePassword, this.password);
    }
}

User.init(
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING, allowNull: false },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        password: { type: DataTypes.STRING, allowNull: false },

        role: { type: DataTypes.ENUM('student', 'staff', 'security', 'admin', 'guest'), defaultValue: 'student' },
        studentId: { type: DataTypes.STRING },
        phone: { type: DataTypes.STRING },

        googleId: { type: DataTypes.STRING },
        avatar: { type: DataTypes.STRING },

        isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
        verificationToken: { type: DataTypes.STRING },
        resetPasswordToken: { type: DataTypes.STRING },
        resetPasswordExpires: { type: DataTypes.DATE },

        preferences: { type: DataTypes.JSON, defaultValue: {} },
        privacySettings: { type: DataTypes.JSON, defaultValue: {} },

        emergencyContacts: { type: DataTypes.JSON, defaultValue: [] },
        trustedCircle: { type: DataTypes.JSON, defaultValue: [] },
    },
    {
        sequelize,
        tableName: 'users',
        timestamps: true,
        hooks: {
            beforeSave: async (user) => {
                if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
        },
    }
);

export default User;
