import { Sequelize } from 'sequelize';
import "./LoadEnv.js";


const DB_NAME = process.env.MYSQL_DB || 'unisafe';
const DB_USER = process.env.MYSQL_USER || 'root';
const DB_PASS = process.env.MYSQL_PASSWORD || '';
const DB_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const DB_PORT = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306;

export const sequelize = new Sequelize(
    process.env.MYSQL_DB,            // database
    process.env.MYSQL_USER,          // username
    process.env.MYSQL_PASSWORD,      // password
    {
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT || 3306),
        dialect: "mysql",
        logging: false,
    }
);


const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log(`✅ MySQL Connected: ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
        await sequelize.sync();
        console.log('✅ Sequelize models synchronized');
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        process.exit(1);
    }
};

export default connectDB;
