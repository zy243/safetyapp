// server.js
import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import connectDB from './config/database.js';
import "./config/LoadEnv.js"; // <-- must come first
import app from "./app.js";

const PORT = process.env.PORT || 5000;

// In-memory storage for simplicity
let sessions = [];
let trustedContacts = [
    { id: '1', name: 'Sarah Mom', phone: '+1 (555) 123-4567', relationship: 'Mother' },
    { id: '2', name: 'Mike Dad', phone: '+1 (555) 234-5678', relationship: 'Father' },
    { id: '3', name: 'Emma Friend', phone: '+1 (555) 345-6789', relationship: 'Best Friend' },
];



// ---------------------------
// Connect to database
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
        origin: (origin, callback) => {
            const allowedOrigins = [
                process.env.FRONTEND_URL,
                process.env.CORS_ORIGIN,
                'http://localhost:19006',
                'http://localhost:3000',
                'http://192.168.0.170:19006',
                'http://192.168.0.170:3000'
            ].filter(Boolean);

            if (!origin) return callback(null, true);
            const isExpoDev = origin.startsWith('exp://') || origin.startsWith('@exp://');
            const isAllowed = isExpoDev || allowedOrigins.some(o => origin === o || origin.startsWith(o));
            if (isAllowed) return callback(null, true);
            return callback(new Error(`CORS blocked for origin: ${origin}`));
        },
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
// MongoDB connection removed; using MySQL via Sequelize now


// ---------------------------
// Graceful shutdown
// ---------------------------
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down...`);
    server.close(() => console.log('HTTP server closed'));
    // MySQL connection handled by Sequelize
    io.close();
    process.exit(0);
};

['SIGINT', 'SIGTERM', 'uncaughtException', 'unhandledRejection'].forEach((event) => {
    process.on(event, () => gracefulShutdown(event));
});

// ----------------------
// Routes
// ----------------------

// Get all trusted contacts
app.get('/api/contacts', (req, res) => {
    res.json({ contacts: trustedContacts });
});

// Start Guardian session
app.post('/api/guardian/start', (req, res) => {
    const { destination, trustedContacts: contacts, estimatedArrival, route } = req.body;

    if (!destination || !contacts || contacts.length === 0) {
        return res.status(400).json({ error: 'Destination and trusted contacts are required' });
    }

    const session = {
        id: uuidv4(),
        startTime: new Date(),
        destination,
        estimatedArrival: new Date(estimatedArrival),
        isActive: true,
        route: route || [],
        trustedContacts: contacts,
    };

    sessions.push(session);

    console.log('Guardian session started:', session);

    // In a real app, notify contacts via SMS/Email/Push here

    res.json({ session });
});

// Stop Guardian session
app.post('/api/guardian/stop', (req, res) => {
    const { sessionId } = req.body;
    const index = sessions.findIndex(s => s.id === sessionId);

    if (index === -1) return res.status(404).json({ error: 'Session not found' });

    const stoppedSession = sessions.splice(index, 1)[0];
    console.log('Guardian session stopped:', stoppedSession);

    // In a real app, notify contacts session stopped

    res.json({ message: 'Guardian session stopped' });
});

// Safety check-in
app.post('/api/guardian/checkin', (req, res) => {
    const { sessionId, response } = req.body;
    const session = sessions.find(s => s.id === sessionId);

    if (!session) return res.status(404).json({ error: 'Session not found' });

    console.log(`Check-in received for session ${sessionId}: ${response}`);
    // In a real app, log response in DB

    res.json({ message: 'Check-in recorded' });
});

// Emergency escalation
app.post('/api/guardian/emergency', (req, res) => {
    const { sessionId } = req.body;
    const session = sessions.find(s => s.id === sessionId);

    if (!session) return res.status(404).json({ error: 'Session not found' });

    console.log(`Emergency escalation triggered for session ${sessionId}`);
    // In real app, notify all trusted contacts + campus security

    res.json({ message: 'Emergency escalation triggered' });
});

// Get session by ID
app.get('/api/guardian/session/:id', (req, res) => {
    const session = sessions.find(s => s.id === req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ session });
});

// This is handled by the main server setup below