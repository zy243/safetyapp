// filepath: src/config/config.js
module.exports = {
    // Server Configuration
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',

    // MongoDB Configuration
    MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/campus-safety',

    // JWT Configuration
    JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',

    // Email Configuration (Gmail)
    EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
    EMAIL_PORT: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
    EMAIL_USER: process.env.EMAIL_USER || 'your-email@gmail.com',
    EMAIL_PASS: process.env.EMAIL_PASS || 'your-app-password',
    EMAIL_NAME: process.env.EMAIL_NAME || 'Campus Safety', // changed from EMAIL_FROM

    // Google OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',

    // Twilio Configuration (for SMS)
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || 'your-twilio-account-sid',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || 'your-twilio-auth-token',
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || 'your-twilio-phone-number',

    // Google API (for chatbot and maps)
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || 'AIzaSyBClh6OLOiyM0zKKQ7hcwXbqlUqyMX0T30',
    GOOGLE_CSE_ID: process.env.GOOGLE_CSE_ID || 'your-google-cse-id',

    // File Upload
    MAX_UPLOAD_MB: process.env.MAX_UPLOAD_MB ? Number(process.env.MAX_UPLOAD_MB) : 25,

    // Base URL for email verification links
    BASE_URL: process.env.BASE_URL || 'http://localhost:5000',

    // CORS Configuration
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

    // Frontend URL for email verification
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
};
