# Campus Safety Backend

A comprehensive backend API for a campus safety application with real-time features, emergency response, and safety management.

## 🚀 Features

### 🔑 Authentication
- **Google Sign-In**: Secure authentication using Google OAuth
- **Guest Mode**: Anonymous access for browsing reports (limited features)
- **User Profile Management**: Personal information and preferences
- **Role-based Access**: Student, Teacher, Security, Staff, and Guest roles

### 🏠 Home Page Features
- **SOS Button**: Triple-tap emergency activation with live location sharing
- **Follow Me**: Real-time location tracking for trusted contacts
- **Safety Alerts**: Quick access to recent campus incidents
- **Safe Routes**: Navigation shortcuts to avoid dangerous areas
- **Quick Actions**: Easy access to campus security and trusted circle

### 📱 Safety Alerts & Notifications
- **Push Notifications**: Real-time alerts for nearby incidents
- **Emergency Broadcasts**: Immediate notifications for urgent situations
- **Customizable Settings**: Control notification preferences and frequency
- **Multi-channel Delivery**: Push, Email, and SMS notifications

### 👤 Profile & Settings
- **Personal Information**: Name, email, student/staff ID
- **Trusted Circle**: Manage family and friend contacts
- **Privacy Controls**: Anonymous mode and location sharing preferences
- **Emergency Numbers**: Campus security, police, and medical contacts
- **App Preferences**: Language, theme, and notification settings

## 🛠️ Technology Stack

- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.io** for real-time communication
- **JWT** for authentication
- **Google OAuth** for social login
- **Nodemailer** for email notifications
- **Twilio** for SMS notifications

## 📋 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /google` - Google OAuth authentication
- `POST /guest` - Guest mode authentication
- `GET /me` - Get current user profile
- `PUT /profile` - Update user profile
- `PUT /privacy` - Update privacy settings
- `PUT /preferences` - Update app preferences
- `POST /trusted-circle` - Manage trusted circle
- `POST /emergency-contacts` - Manage emergency contacts

### SOS (`/api/sos`)
- `POST /trigger` - Trigger SOS alert
- `GET /status` - Get SOS status
- `PUT /update` - Update SOS location

### Safety Alerts (`/api/safety-alerts`)
- `POST /report` - Report a safety alert
- `GET /nearby` - Get nearby safety alerts
- `GET /all` - Get all alerts (admin/security)
- `PUT /:alertId/status` - Update alert status
- `GET /stats` - Get alert statistics

### Safe Routes (`/api/safe-routes`)
- `POST /create` - Create a new safe route
- `GET /find` - Find safe routes between points
- `GET /:routeId` - Get route details
- `POST /:routeId/rate` - Rate a route
- `GET /popular` - Get popular routes
- `PUT /:routeId` - Update route
- `GET /stats` - Get route statistics

### Follow Me (`/api/follow-me`)
- `POST /start` - Start Follow Me session
- `PUT /location` - Update location
- `POST /stop` - Stop Follow Me session
- `GET /status` - Get Follow Me status
- `GET /shared/:userId` - Get shared location
- `GET /history` - Get Follow Me history
- `PUT /settings` - Update settings

### Notifications (`/api/notifications`)
- `GET /` - Get user notifications
- `PUT /:notificationId/read` - Mark as read
- `PUT /read-all` - Mark all as read
- `DELETE /:notificationId` - Delete notification
- `POST /send` - Send notification (admin/security)
- `POST /send-bulk` - Send bulk notifications
- `GET /stats` - Get notification statistics

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd campus-safety-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file with the following variables:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/campus-safety
   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRE=7d
   GOOGLE_CLIENT_ID=your_google_client_id
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_password
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=your_twilio_phone
   ```

4. **Start the server**
   ```bash
   npm run dev
   ```

## 📱 Real-time Features

### Socket.io Events
- `join-user` - Join user's personal room
- `follow-me-update` - Follow Me location updates
- `sos-alert` - SOS emergency alerts
- `safety-alert` - Safety incident alerts

### Real-time Notifications
- Push notifications for nearby incidents
- Live location sharing for Follow Me
- Emergency broadcasts to security
- Real-time SOS alerts

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Privacy controls for location sharing
- Anonymous reporting options
- Secure password hashing with bcrypt
- Input validation and sanitization

## 📊 Data Models

### User Model
- Personal information (name, email, phone)
- Role-based permissions
- Trusted circle contacts
- Emergency contacts
- Privacy settings
- App preferences
- Device information

### Safety Alert Model
- Incident details and location
- Severity and category classification
- Anonymous reporting support
- Affected area radius
- Notification tracking

### Safe Route Model
- Route coordinates and waypoints
- Safety level assessment
- User ratings and reviews
- Usage statistics
- Feature flags (lighting, security, etc.)

### Follow Me Model
- Real-time location tracking
- Session management
- Location history
- Privacy controls
- Trusted contact sharing

### Notification Model
- Multi-channel delivery (push, email, SMS)
- Priority levels
- Read/unread status
- Delivery tracking
- Expiration handling

## 🚨 Emergency Response

### SOS System
- Triple-tap activation
- Live location sharing
- Automatic emergency contact notification
- Real-time alert to security
- Call logging and tracking

### Safety Alerts
- Anonymous incident reporting
- Location-based alert distribution
- Severity classification
- Real-time notifications
- Resolution tracking

## 📈 Analytics & Reporting

- Incident statistics and trends
- Route usage analytics
- Notification delivery metrics
- User engagement tracking
- Safety pattern analysis

## 🔧 Development

### Running in Development
```bash
npm run dev
```

### Production Build
```bash
npm start
```

### Environment Variables
Make sure to set up all required environment variables in your `.env` file before running the application.

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions, please contact the development team or create an issue in the repository.
