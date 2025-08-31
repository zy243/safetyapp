import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import cron from 'node-cron';

// Routers
import escortRouter from './routes/escort.js';
import locationRouter from './routes/location.js';
import authRoutes from './routes/auth.js';
import sosRoutes from './routes/sos.js';
import chatbotRoute from './routes/chatbot.js';
import searchHistoryRoutes from './routes/searchHistory.js';
import safetyAlertRoutes from './routes/safetyAlerts.js';
import safeRouteRoutes from './routes/safeRoutes.js';
import followMeRoutes from './routes/followMe.js';
import notificationRoutes from './routes/notifications.js';
import incidentRoutes from './routes/incidents.js';
import homeRoutes from './routes/home.js';
import guardianRoutes from './routes/guardian.js';
import tripRoutes from './routes/trips.js';
import checkinRoutes from './routes/checkins.js';
import flashlightRoutes from './routes/flashlight.js';

// Models
import User from './models/User.js';
import Escort from './models/Escort.js';
import Incident from './models/Incident.js';
import SOSAlert from './models/SOSAlert.js';
import SafetyAlert from './models/SafetyAlert.js';
import Trip from './models/Trip.js';
import Checkin from './models/Checkin.js';
import LocationUpdate from './models/LocationUpdate.js';
import FlashlightSession from './models/FlashlightSession.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true
    }
});
app.set('io', io);

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cors({ origin: process.env.FRONTEND_URL || true, credentials: true }));
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// Routes
app.use('/api/escort', escortRouter);
app.use('/api/location', locationRouter);
app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/chat', chatbotRoute);
app.use('/api/search-history', searchHistoryRoutes);
app.use('/api/safety-alerts', safetyAlertRoutes);
app.use('/api/safe-routes', safeRouteRoutes);
app.use('/api/follow-me', followMeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/guardian', guardianRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/flashlight', flashlightRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        time: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// Background task for overdue check-ins
cron.schedule('* * * * *', async () => {
    try {
        const { checkOverdueCheckins } = await import('./services/notificationService.js');
        await checkOverdueCheckins();
        console.log('Checked for overdue check-ins');
    } catch (error) {
        console.error('Error in background check:', error);
    }
});

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/campus-safety';
const connectWithRetry = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });
        console.log('✅ MongoDB connected');

        // Start server
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        setTimeout(connectWithRetry, 5000);
    }
};
connectWithRetry();

// Socket.IO events
io.on('connection', (socket) => {
    console.log('✅ Socket connected:', socket.id);

    socket.on('join-user', (userId) => {
        socket.join(`user_${userId}`);
    });

    socket.on('guardian-location-update', async (data) => {
        if (!data.tripId || !data.coordinates) return;
        const locationUpdate = await LocationUpdate.create({
            trip: data.tripId,
            user: socket.userId,
            coordinates: data.coordinates,
            address: data.address || '',
            timestamp: new Date()
        });

        const trip = await Trip.findById(data.tripId).populate('trustedContacts');
        if (trip?.trustedContacts) {
            trip.trustedContacts.forEach(contact => {
                io.to(`user_${contact.user}`).emit('guardian-location-update', {
                    tripId: data.tripId,
                    location: data.coordinates,
                    address: data.address,
                    timestamp: new Date(),
                    userId: socket.userId
                });
            });
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', socket.id, reason);
    });
});

// Global error & 404 handlers
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});
app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found', path: req.originalUrl });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down...`);
    server.close(() => console.log('HTTP server closed'));
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    io.close();
    process.exit(0);
};
['SIGINT', 'SIGTERM', 'uncaughtException', 'unhandledRejection'].forEach(event => {
    process.on(event, () => gracefulShutdown(event));
});

export default app;
