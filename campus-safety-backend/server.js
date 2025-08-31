// server.js
require('dotenv').config(); // ✅ Load .env first

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// ====================
// ROUTES
// ====================
const authRoutes = require('./routes/auth');
const sosRoutes = require('./routes/sos');
const chatbotRoute = require('./routes/chatbot');
const searchHistoryRoutes = require('./routes/searchHistory');
const safetyAlertRoutes = require('./routes/safetyAlerts');
const safeRouteRoutes = require('./routes/safeRoutes');
const followMeRoutes = require('./routes/followMe');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);

// ====================
// SOCKET.IO
// ====================
const io = new Server(server, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS || '*',
        methods: ['GET', 'POST'],
    },
});

// ====================
// MIDDLEWARE
// ====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Attach io to app so routes can emit events
app.set('io', io);

// ====================
// ROUTES
// ====================
app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/chat', chatbotRoute);
app.use('/api/search-history', searchHistoryRoutes);
app.use('/api/safety-alerts', safetyAlertRoutes);
app.use('/api/safe-routes', safeRouteRoutes);
app.use('/api/follow-me', followMeRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/', (req, res) => {
    res.send('🚀 Campus Safety Backend Running');
});

// ====================
// SOCKET.IO EVENTS
// ====================
io.on('connection', (socket) => {
    console.log('✅ Socket connected:', socket.id);

    // Personal room
    socket.on('join-user', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined their room`);
    });

    // General room
    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room ${room}`);
    });

    // Follow Me updates
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

    // SOS alerts
    socket.on('sos-alert', (data) => {
        io.to('security').emit('sosAlert', data);
        io.to('emergency').emit('sosAlert', data);
    });

    // Safety alerts
    socket.on('safety-alert', (data) => {
        if (data.areaId) {
            io.to(`area_${data.areaId}`).emit('safetyAlert', data);
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ Socket disconnected:', socket.id);
    });
});

// ====================
// DATABASE + SERVER START
// ====================
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/campus-safety';

if (!process.env.JWT_SECRET) {
    console.warn('⚠️ Warning: JWT_SECRET not set in .env');
}

mongoose
    .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('✅ MongoDB connected successfully');
        server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });
