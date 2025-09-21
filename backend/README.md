# UniSafe Backend API

A comprehensive backend API for the UniSafe safety application, built with Node.js, Express, and MongoDB.

## Features

- **User Authentication & Authorization**: JWT-based authentication with role-based access control
- **Guardian Mode**: Real-time location tracking and safety monitoring for students
- **SOS Alert System**: Emergency alert system with staff monitoring
- **Push Notifications**: Real-time notifications via Expo push notifications
- **Real-time Communication**: WebSocket support for live updates
- **Staff Dashboard**: Comprehensive monitoring tools for security staff

## Tech Stack

- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.IO
- **Notifications**: Expo Server SDK
- **Email**: Nodemailer
- **Security**: Helmet, CORS, Rate Limiting

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `GET /me` - Get current user
- `PUT /profile` - Update user profile
- `POST /push-token` - Update push notification token
- `POST /logout` - User logout

### Guardian Mode (`/api/guardian`)
- `POST /start-session` - Start guardian session
- `PUT /update-location` - Update current location
- `POST /check-in` - Respond to safety check-in
- `POST /end-session` - End guardian session
- `GET /sessions` - Get user's guardian sessions
- `GET /active-session` - Get current active session

### Student Features (`/api/student`)
- `GET /profile` - Get student profile
- `PUT /profile` - Update student profile
- `POST /sos` - Send SOS alert
- `GET /sos-history` - Get SOS alert history
- `GET /guardian-sessions` - Get guardian sessions
- `GET /dashboard` - Get student dashboard data

### Staff Features (`/api/staff`)
- `GET /sos-monitoring` - Get SOS alerts for monitoring
- `PUT /sos-alert/:alertId/acknowledge` - Acknowledge SOS alert
- `PUT /sos-alert/:alertId/resolve` - Resolve SOS alert
- `GET /guardian-sessions` - Get active guardian sessions
- `GET /guardian-session/:sessionId` - Get specific guardian session
- `GET /dashboard` - Get staff dashboard data
- `GET /students` - Get all students
- `GET /student/:studentId` - Get specific student details

### Notifications (`/api/notifications`)
- `GET /` - Get user's notifications
- `PUT /:notificationId/read` - Mark notification as read
- `PUT /read-all` - Mark all notifications as read
- `DELETE /:notificationId` - Delete notification
- `GET /unread-count` - Get unread notification count
- `GET /stats` - Get notification statistics

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/unisafe

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Expo Push Notifications
EXPO_ACCESS_TOKEN=your-expo-access-token

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:8081

# Google Maps API
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp env.example .env
# Edit .env with your configuration
```

3. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## Database Models

### User
- User authentication and profile information
- Role-based access (student, staff, security, admin)
- Emergency contacts and preferences

### GuardianSession
- Active guardian mode sessions
- Location tracking and route history
- Safety check-ins and emergency escalation

### SOSAlert
- Emergency alerts from students
- Staff assignment and response tracking
- Resolution and notes

### Notification
- Push, email, and in-app notifications
- Multi-channel delivery system
- Read status and priority levels

## Real-time Features

The API supports real-time communication through Socket.IO:

- **Location Updates**: Live location tracking during guardian sessions
- **SOS Alerts**: Instant emergency notifications
- **Guardian Notifications**: Real-time updates to trusted contacts
- **Staff Monitoring**: Live dashboard updates for security staff

## Security Features

- JWT-based authentication
- Role-based authorization
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation and sanitization

## Notification System

- **Push Notifications**: Via Expo push notification service
- **Email Notifications**: HTML email templates
- **SMS Notifications**: Placeholder for SMS service integration
- **In-app Notifications**: Real-time updates via WebSocket

## API Documentation

The API follows RESTful conventions and returns JSON responses. All endpoints require authentication unless specified otherwise.

### Response Format

```json
{
  "message": "Success message",
  "data": { ... },
  "error": "Error message (if applicable)"
}
```

### Error Handling

The API returns appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Development

The backend uses ES modules and modern JavaScript features. Make sure you're using Node.js 14+ for full compatibility.

### Project Structure

```
backend/
├── config/
│   └── database.js
├── middleware/
│   └── auth.js
├── models/
│   ├── User.js
│   ├── GuardianSession.js
│   ├── Notification.js
│   └── SOSAlert.js
├── routes/
│   ├── auth.js
│   ├── guardian.js
│   ├── student.js
│   ├── staff.js
│   └── notifications.js
├── services/
│   ├── notificationService.js
│   └── socketService.js
├── server.js
├── package.json
└── README.md
```

## License

MIT License - see LICENSE file for details.
