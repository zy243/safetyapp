# UniSafe - Unified Frontend & Backend

This is a unified project structure that combines both the frontend (React Native/Expo) and backend (Node.js/Express) in a single repository.

## 🚀 Quick Start (Windows)

**Easiest way to get started:**
1. Double-click `start-unified.bat`
2. Wait for both backend and frontend to start
3. Open `test-api.html` in your browser to test the connection

## 📁 Project Structure

```
frontend/
├── app/                    # Expo Router app structure
├── components/             # React Native components
├── services/              # Frontend services
├── config/                # Frontend configuration
├── backend/               # Backend server code (NEW!)
│   ├── config/           # Backend configuration
│   ├── middleware/       # Express middleware
│   ├── routes/          # API routes
│   ├── utils/           # Backend utilities
│   ├── app.js           # Express app configuration
│   └── server.js        # Server entry point
├── package.json         # Unified dependencies
├── env-config.txt       # Environment template
├── start-unified.bat    # Windows startup script
├── test-api.html        # API testing interface
└── README.md           # This file
```

## ⚙️ Setup Instructions

### 1. Environment Configuration
The startup script will automatically create a `.env` file from the template, but you can also do it manually:
- Copy `env-config.txt` to `.env`
- Update the environment variables if needed (defaults work for development)

### 2. Database Setup (Optional for testing)
- Install MySQL if you want to use the database features
- Create a database named `unisafe`
- Update the database credentials in `.env`

### 3. Running the Application

**Option 1: Use the Windows Batch Script (Recommended)**
```bash
# Double-click this file or run in command prompt:
start-unified.bat
```

**Option 2: Run both frontend and backend together**
```bash
npm run dev
```

**Option 3: Run them separately**
```bash
# Terminal 1 - Backend
npm run backend

# Terminal 2 - Frontend  
npm start
```

## 🔧 Available Scripts

- `npm start` - Start the Expo frontend
- `npm run backend` - Start the backend server
- `npm run backend:dev` - Start the backend with nodemon (auto-restart)
- `npm run dev` - Start both frontend and backend concurrently
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser

## 🌐 Backend API Endpoints

- `GET /api/health` - Health check
- `GET /api/contacts` - Get trusted contacts
- `POST /api/guardian/start` - Start guardian session
- `POST /api/guardian/stop` - Stop guardian session
- `POST /api/guardian/checkin` - Safety check-in
- `POST /api/guardian/emergency` - Emergency escalation

## 🧪 Testing the Connection

1. **Start the backend server** (should run on port 5000)
2. **Open `test-api.html`** in your browser
3. **Click the test buttons** to verify API endpoints are working
4. **Check the console** for any error messages

## 🐛 Troubleshooting

### Backend won't start
- Check if port 5000 is available
- Make sure you have Node.js installed
- Run `npm install` to install dependencies

### Frontend can't connect to backend
- Verify backend is running on port 5000
- Check the BACKEND_URL in your environment variables
- Make sure CORS is properly configured

### Database connection issues
- Verify MySQL is running
- Check database credentials in `.env`
- Create the `unisafe` database if it doesn't exist

## 📱 Frontend Features

- React Native with Expo
- Expo Router for navigation
- Google Maps integration
- Voice input capabilities
- Real-time communication with backend
- Guardian safety features

## 🔗 Key Features Implemented

1. **Unified Dependencies**: Single `package.json` with all frontend and backend dependencies
2. **Error-Free Code**: All import/export errors resolved
3. **Database Integration**: MySQL/Sequelize properly configured
4. **Real-time Communication**: Socket.IO setup for live updates
5. **API Endpoints**: Complete REST API for guardian features
6. **Environment Configuration**: Proper .env setup with template
7. **Testing Tools**: HTML test interface for API verification
8. **Documentation**: Comprehensive README with setup instructions

## 🎯 Development Notes

- The backend runs on port 5000 by default
- The frontend runs on port 19006 (Expo default)
- Socket.IO is configured for real-time communication
- CORS is configured to allow frontend-backend communication
- All backend code is now located in the `backend/` directory within the frontend folder

## 📞 Support

If you encounter any issues:
1. Check the console for error messages
2. Verify all dependencies are installed
3. Make sure the environment variables are set correctly
4. Test the API endpoints using the provided test interface