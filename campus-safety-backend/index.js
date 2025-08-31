const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { readDB } = require('./db.js');

// Routers
const reportsRouter = require('./routes/reports.js');
const escortRouterModule = require('./routes/escort.js');
const locationRouter = require('./routes/location.js');

const escortRouter = escortRouterModule.router;
const { checkOverdueLoop } = escortRouterModule;

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// =====================
// MIDDLEWARES
// =====================
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cors({
    origin: true, // allow all origins
    credentials: true
}));

// Serve uploads statically
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// =====================
// HEALTH CHECK
// =====================
app.get('/api/health', (req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
});

// =====================
// ROUTES
// =====================
app.use('/api/reports', reportsRouter);
app.use('/api/escort', escortRouter); // changed to /api/escort for clarity
app.use('/api/location', locationRouter);

// =====================
// HOME PAGE
// =====================
app.get('/', async (req, res) => {
    try {
        const db = await readDB();
        const counts = {
            users: db.users.length,
            reports: db.reports.length,
            escorts: db.escorts.length,
            shares: db.shares.length,
            alerts: db.alerts.length
        };
        res.send(`<h1>CodeNection Campus Safety API</h1>
    <p>OK - ${new Date().toISOString()}</p>
    <pre>${JSON.stringify({ counts }, null, 2)}</pre>`);
    } catch (err) {
        console.error('Error reading DB for home page:', err);
        res.status(500).send('Server error');
    }
});

// =====================
// START SERVER
// =====================
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);

    // Start overdue checker loop safely
    if (typeof checkOverdueLoop === 'function') {
        checkOverdueLoop();
    } else {
        console.warn('checkOverdueLoop is not defined or not a function.');
    }
});
