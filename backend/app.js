// app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import passport from 'passport';
import session from 'cookie-session';
import './passport.js'; // <-- import passport configuration
import cookieSession from 'cookie-session';


// OAuth strategy
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

dotenv.config();

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes
import authRoutes from './routes/auth.js';
import sosRoutes from './routes/sos.js';
import guardianRoutes from './routes/guardian.js';
import incidentRoutes from './routes/incidents.js';
import userRoutes from './routes/users.js';

// Middleware
import { errorHandler } from './middleware/error.js';

const app = express();

// ---------------------------
// Security middleware
// ---------------------------
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(compression());
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// ---------------------------
// Rate limiting
// ---------------------------
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'defaultsecret'],
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));


// ---------------------------
// Body parsing
// ---------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ---------------------------
// Logging (development only)
// ---------------------------
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('combined'));
}

// ---------------------------
// Static files
// ---------------------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------------------------
// Cookie session & Passport
// ---------------------------
app.use(session({
    name: 'unisafe-session',
    keys: [process.env.SESSION_SECRET],
    maxAge: 24 * 60 * 60 * 1000
}));

app.use(passport.initialize());
app.use(passport.session());

// ---------------------------
// Passport Google OAuth
// ---------------------------
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
    // You can save profile to DB here if needed
    done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ---------------------------
// OAuth routes
// ---------------------------
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login-failed' }),
    (req, res) => {
        // Successful login -> redirect to frontend with user info
        const userInfo = encodeURIComponent(JSON.stringify(req.user));
        res.redirect(`${process.env.FRONTEND_URL}/login-success?user=${userInfo}`);
    }
);

app.get('/login-failed', (req, res) => {
    res.send('Login Failed');
});

// ---------------------------
// Existing routes
// ---------------------------
app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/guardian', guardianRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/users', userRoutes);

// ---------------------------
// Health check
// ---------------------------
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'UniSafe Backend API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            sos: '/api/sos',
            guardian: '/api/guardian',
            incidents: '/api/incidents',
            users: '/api/users',
            googleOAuth: '/auth/google'
        }
    });
});

// Favicon
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'favicon.ico'));
});

// ---------------------------
// 404 handler
// ---------------------------
app.all('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// ---------------------------
// Global error handler
// ---------------------------
app.use(errorHandler);

export default app;
