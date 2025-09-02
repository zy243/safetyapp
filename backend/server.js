// server.js
import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import cron from 'node-cron';
import connectDB from './config/database.js';
import app from './app.js';

const PORT = process.env.PORT || 5000;

// ---------------------------
// Connect to MongoDB
// ---------------------------
connectDB();

// ---------------------------
// Create HTTP server
// ---------------------------
const server = http.createServer(app);

// ---------------------------
// Socket.IO setup
// ---------------------------
const io = new Server(server, {
    cors: {
        origin: '*', // allow all origins for development; later restrict to your frontend IP/URL
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
    },
});

app.set('io', io);

// Socket.IO events
io.on('connection', (socket) => {
    console.log('✅ Socket connected:', socket.id);

    socket.on('join-user', (userId) => {
        socket.join(`user_${userId}`);
    });

    socket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', socket.id, reason);
    });
});

// ---------------------------
// Background cron jobs (example)
// ---------------------------
cron.schedule('0 0 * * *', async () => {
    try {
        const { checkOverdueCheckins } = await import('./services/notificationService.js');
        await checkOverdueCheckins();
        console.log('Checked for overdue check-ins');
    } catch (error) {
        console.error('Error in cron job:', error);
    }
});

// ---------------------------
// Start server on all network interfaces
// ---------------------------
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`💻 Use your computer IPv4 to connect from mobile, e.g., http://192.168.0.170:${PORT}`);
});
mongoose.connect(process.env.MONGO_URI);

mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
});


// ---------------------------
// Graceful shutdown
// ---------------------------
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down...`);
    server.close(() => console.log('HTTP server closed'));
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    io.close();
    process.exit(0);
};

['SIGINT', 'SIGTERM', 'uncaughtException', 'unhandledRejection'].forEach((event) => {
    process.on(event, () => gracefulShutdown(event));
});
