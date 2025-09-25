import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import fetch from 'node-fetch';

// Routers
import authRouter from './routes/auth';
import contactsRouter from './routes/contacts';
import guardianRouter from './routes/guardian';
import locationsRouter from './routes/locations';
import universitiesRouter from './routes/universities';
import reportsRouter from './routes/reports';
import notificationsRouter from './routes/notifications';
import statusRouter from './routes/status';
import safetyAlertsRouter from './routes/safetyAlerts';
import sosRouter from './routes/sos';

// Models (register with mongoose)
import './models/User';
import './models/Contact';
import './models/GuardianSession';
import './models/Notification';
import './models/LocationUpdate';
import './models/Report';

// Database utils
import { initializeDatabase } from './database/init';
import { setupDatabaseConnection } from './database/connection';

dotenv.config();

// --- Environment defaults ---
process.env.MONGO_URI =
    process.env.MONGO_URI ||
    'mongodb+srv://unisafe:unisafestrongpass1234@cluster0.vjuq4ox.mongodb.net/unisafe?retryWrites=true&w=majority';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'changeme';
process.env.PORT = process.env.PORT || '4000';
process.env.CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:19006';

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

// --- Middlewares ---
app.use(helmet());
app.use(
    cors({
        origin: (_origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) =>
            cb(null, true),
        credentials: true,
    })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Mock incidents (replace later with DB collection)
const mockIncidents = [
    { id: 1, title: "Robbery", lat: 3.121, lng: 101.653, type: "crime" },
    { id: 2, title: "Accident", lat: 3.118, lng: 101.655, type: "accident" },
];

app.get("/api/incidents", async (_req: Request, res: Response) => {
    try {
        // Later replace with MongoDB query like: await Incident.find()
        res.json({ incidents: mockIncidents });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch incidents" });
    }
});


// --- Health Check ---
app.get('/api/health', async (_req, res) => {
    try {
        const dbState = mongoose.connection.readyState;
        const dbStatus = dbState === 1 ? 'connected' : 'disconnected';

        const userCount = await mongoose.connection.db.collection('users').countDocuments();
        const notificationCount = await mongoose.connection.db
            .collection('notifications')
            .countDocuments();
        const sessionCount = await mongoose.connection.db
            .collection('guardiansessions')
            .countDocuments();

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: {
                status: dbStatus,
                collections: {
                    users: userCount,
                    notifications: notificationCount,
                    guardianSessions: sessionCount,
                },
            },
            services: {
                notifications: 'active',
                guardianMode: 'active',
                authentication: 'active',
            },
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Health check failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// --- API Routes ---
app.use('/api/auth', authRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/guardian', guardianRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/universities', universitiesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/status', statusRouter);
app.use('/api/sos', sosRouter);
app.use('/api/safety-alerts', safetyAlertsRouter);

// --- Guardian Activation Push Notification ---
app.post('/api/guardian/activate', async (req: Request, res: Response) => {
    const { guardianPushToken, studentName } = req.body;

    if (!guardianPushToken || !studentName) {
        return res.status(400).json({ error: 'guardianPushToken and studentName are required' });
    }

    const message = {
        to: guardianPushToken,
        sound: 'default',
        title: 'Guardian Alert 🚨',
        body: `${studentName} has activated Guardian Mode. Tap to view location.`,
        data: { screen: 'GuardianLocation' },
    };

    try {
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        res.json({ success: true, message: 'Notification sent to guardian' });
    } catch (err) {
        console.error('❌ Error sending guardian notification:', err);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

// --- Start Server ---
async function start() {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI not set');
        }

        setupDatabaseConnection();
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB:', mongoose.connection.name);

        await initializeDatabase();

        app.listen(port, () => {
            console.log(`🚀 Backend running on http://localhost:${port}`);
            console.log(`📱 API base: http://localhost:${port}/api`);
            console.log(`🔔 Notifications system ready`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}

start();

export default app;
