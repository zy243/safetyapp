# UniSave - Campus Safety App

A comprehensive campus safety application with email verification, real-time alerts, and location-based services.

## Features

- **User Authentication with Email Verification**
- **Role-based Access Control** (Student, Staff, Teacher, Security)
- **Real-time Safety Alerts**
- **Location-based Services**
- **Emergency SOS System**
- **Follow Me Feature**
- **Trusted Circle Management**

## Email Verification System

The app implements a secure email verification flow:

1. **User Registration**: Users sign up with email, password, and role
2. **Verification Email**: System sends verification link to user's email
3. **Email Verification**: User clicks link to verify account
4. **Account Activation**: Verified users can now log in and access the app

## Backend Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- SMTP email service (Gmail, SendGrid, etc.)

### Installation

1. Navigate to the backend directory:
```bash
cd campus-safety-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your configuration:
```env
MONGODB_URI=mongodb://localhost:27017/campus-safety
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

4. Start the server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify-email/:token` - Email verification
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user profile

## Frontend Setup

### Prerequisites
- Node.js (v16 or higher)
- Expo CLI
- React Native development environment

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npx expo start
```

## Backend-Frontend Connection

The frontend and backend are connected through:

1. **API Service Layer** (`services/api.ts`)
   - Centralized API communication
   - Error handling and response formatting
   - Environment-based configuration

2. **Authentication Context** (`contexts/AuthContext.tsx`)
   - Manages user authentication state
   - Handles login, logout, and signup
   - Stores authentication tokens securely

3. **Configuration** (`config/api.ts`)
   - Environment-based API configuration
   - Easy switching between development/staging/production

### API Configuration

Update the API configuration in `frontend/frontend/config/api.ts`:

```typescript
export const API_CONFIG = {
  development: {
    baseUrl: 'http://localhost:5000/api',
    timeout: 10000,
  },
  production: {
    baseUrl: 'https://your-production-domain.com/api',
    timeout: 15000,
  }
};
```

## Email Verification Flow

### 1. User Registration
```typescript
// User fills signup form
const result = await signup({
  name: "John Doe",
  email: "john@example.com",
  password: "securepassword",
  role: "student"
});

// Backend creates user with isVerified: false
// Sends verification email
// Returns success message (no token yet)
```

### 2. Email Verification
```typescript
// User receives email with verification link
// Link format: /email-verification?token=abc123

// Frontend calls verification endpoint
const response = await apiService.verifyEmail(token);

// Backend verifies token and sets isVerified: true
// User can now log in
```

### 3. User Login
```typescript
// User attempts to log in
const response = await apiService.login({
  email: "john@example.com",
  password: "securepassword"
});

// Backend checks isVerified status
// If verified: returns JWT token and user data
// If not verified: returns error with verification requirement
```

## Security Features

- **JWT-based Authentication**
- **Password Hashing** with bcrypt
- **Email Verification** required before login
- **Role-based Access Control**
- **Secure Token Storage** using Expo SecureStore

## Development

### Backend Development
- Uses ES6 modules
- MongoDB with Mongoose ODM
- Express.js REST API
- JWT authentication middleware
- Email service integration

### Frontend Development
- React Native with Expo
- TypeScript for type safety
- Context API for state management
- Secure storage for sensitive data
- Responsive UI components

## Testing the System

1. **Start Backend**: `npm run dev` in `campus-safety-backend`
2. **Start Frontend**: `npx expo start` in `frontend/frontend`
3. **Register New User**: Use signup form
4. **Check Email**: Look for verification email
5. **Verify Email**: Click verification link
6. **Login**: Use verified credentials to log in

## Troubleshooting

### Common Issues

1. **Email not sending**: Check SMTP configuration in `.env`
2. **Verification link not working**: Ensure backend is running and accessible
3. **Frontend can't connect**: Verify API base URL in configuration
4. **JWT errors**: Check JWT_SECRET in backend environment

### Debug Mode

Enable debug logging in backend:
```javascript
// In server.js
process.env.DEBUG = 'app:*';
```

## Deployment

### Backend Deployment
1. Set production environment variables
2. Use production MongoDB instance
3. Configure production SMTP service
4. Set up SSL/TLS certificates

### Frontend Deployment
1. Update API configuration for production
2. Build production bundle
3. Deploy to app stores or web

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

This project is licensed under the MIT License.
