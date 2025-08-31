// server.js
import 'dotenv/config'; // automatically loads .env
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { readDB } from './db.js';

// ====================
// ROUTERS
// ====================
import escortRouter, { checkOverdueLoop } from './routes/escort.js';
import locationRouter from './routes/location.js';
import authRoutes from './routes/auth.js';
import sosRoutes from './routes/sos.js';
import chatbotRoute from './routes/chatbot.js';
import searchHistoryRoutes from './routes/searchHistory.js';
import safetyAlertRoutes from './routes/safetyAlerts.js';
import safeRouteRoutes from './routes/safeRoutes.js';
import followMeRoutes from './routes/followMe.js';
import notificationRoutes from './routes/notifications.js';

// ====================
// APP & SERVER
// ====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// ====================
// SOCKET.IO
// ====================
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});
app.set('io', io);

// ====================
// MIDDLEWARES
// ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cors({ origin: true, credentials: true }));
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// ====================
// ROUTES
// ====================
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

// Health check
app.get('/api/health', (req, res) =>
    res.json({ ok: true, time: new Date().toISOString() })
);

// Home page showing DB counts
app.get('/', async (req, res) => {
    try {
        const db = await readDB();
        const counts = {
            users: db.users.length,
            escorts: db.escorts.length,
            shares: db.shares.length,
            alerts: db.alerts.length,
        };
        res.send(`<h1>Campus Safety API</h1>
<p>OK - ${new Date().toISOString()}</p>
<pre>${JSON.stringify(counts, null, 2)}</pre>`);
    } catch (err) {
        console.error('Error reading DB:', err);
        res.status(500).send('Server error');
    }
});

// ====================
// SOCKET.IO EVENTS
// ====================
io.on('connection', (socket) => {
    console.log('✅ Socket connected:', socket.id);

    socket.on('join-user', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined their room`);
    });

    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room ${room}`);
    });

    socket.on('follow-me-update', (data) => {
        if (data.trustedContacts && Array.isArray(data.trustedContacts)) {
            data.trustedContacts.forEach((contactId) => {
                io.to(`user_${contactId}`).emit('followMeUpdate', {
                    userId: data.userId,
                    userName: data.userName,
                    location: data.location,
                });
            });
        }
    });

    socket.on('sos-alert', (data) => {
        io.to('security').emit('sosAlert', data);
        io.to('emergency').emit('sosAlert', data);
    });

    socket.on('safety-alert', (data) => {
        if (data.areaId) io.to(`area_${data.areaId}`).emit('safetyAlert', data);
    });

    socket.on('disconnect', () => console.log('❌ Socket disconnected:', socket.id));
});
// ====================
// START SERVER + MONGO
// ====================
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/campus-safety';

if (!process.env.JWT_SECRET) console.warn('⚠️ JWT_SECRET not set in .env');

mongoose
    .connect(MONGO_URI) // removed deprecated options
    .then(() => {
        console.log('✅ MongoDB connected');
        server.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            if (typeof checkOverdueLoop === 'function') checkOverdueLoop();
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });
