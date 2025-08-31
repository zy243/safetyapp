import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

// Routes
import authRoutes from './routes/auth.js';
import sosRoutes from './routes/sos.js';
import chatbotRoute from "./routes/chatbot.js";
import searchHistoryRoutes from "./routes/searchHistory.js";
import safetyAlertRoutes from './routes/safetyAlerts.js';
import safeRouteRoutes from './routes/safeRoutes.js';
import followMeRoutes from './routes/followMe.js';
import notificationRoutes from './routes/notifications.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Attach io so routes can emit
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);
app.use("/api/chat", chatbotRoute);
app.use("/api/search-history", searchHistoryRoutes);
app.use('/api/safety-alerts', safetyAlertRoutes);
app.use('/api/safe-routes', safeRouteRoutes);
app.use('/api/follow-me', followMeRoutes);
app.use('/api/notifications', notificationRoutes);

// Example root endpoint
app.get("/", (req, res) => {
    res.send("Campus Safety Backend Running 🚀");
});

// Socket.io
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Join user's personal room for notifications
    socket.on('join-user', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined their room`);
    });

    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room ${room}`);
    });

    // Handle Follow Me location updates
    socket.on('follow-me-update', (data) => {
        // Broadcast to trusted contacts
        data.trustedContacts.forEach(contactId => {
            io.to(`user_${contactId}`).emit('followMeUpdate', {
                userId: data.userId,
                userName: data.userName,
                location: data.location
            });
        });
    });

    // Handle SOS alerts
    socket.on('sos-alert', (data) => {
        // Broadcast to security and emergency contacts
        io.to('security').emit('sosAlert', data);
        io.to('emergency').emit('sosAlert', data);
    });

    // Handle safety alerts
    socket.on('safety-alert', (data) => {
        // Broadcast to nearby users
        io.to(`area_${data.areaId}`).emit('safetyAlert', data);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/campus-safety';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        console.log('MongoDB connected successfully');
        server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error('Mongo connection error', err);
        process.exit(1);
    });