import { connectDB } from './config/database.js';

const start = async () => {
  try {
    console.log('🚀 Starting UniSafe Backend...');
    await connectDB();
    console.log('✅ Database connected successfully');
    console.log('📝 Make sure to set up your .env file with the correct MongoDB URI');
    console.log('🔧 Example: MONGO_URI=mongodb://localhost:27017/unisafe');
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
};

start();
