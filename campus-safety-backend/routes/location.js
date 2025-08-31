import express from 'express';
import fetch from 'node-fetch';
import { nanoid } from 'nanoid';
import { auth } from '../middleware/auth.js';
import { readDB, writeDB } from '../db.js';
import config from '../config.js';

console.log(config.PORT);

const router = express.Router();

const nowISO = () => new Date().toISOString();

// POST /api/location/live-share/start
router.post('/live-share/start', auth, async (req, res) => {
    try {
        const { expiresMinutes } = req.body || {};
        const userId = req.user.id;

        const db = await readDB();
        let share = db.shares.find(s => s.userId === userId && s.active);

        if (!share) {
            share = {
                token: nanoid(16),
                userId,
                active: true,
                createdAt: nowISO(),
                expiresAt: expiresMinutes ? new Date(Date.now() + expiresMinutes * 60000).toISOString() : null
            };
            db.shares.push(share);
        } else if (expiresMinutes) {
            share.expiresAt = new Date(Date.now() + expiresMinutes * 60000).toISOString();
        }

        await writeDB(db);
        const base = (process.env.PUBLIC_BASE_URL || process.env.BASE_URL || '').replace(/\/$/, '');
        const shareUrl = base ? `${base}/api/location/live-share/${share.token}` : `/api/location/live-share/${share.token}`;

        res.json({ ok: true, token: share.token, shareUrl, share });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// POST /api/location/live-share/stop
router.post('/live-share/stop', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const db = await readDB();
        const share = db.shares.find(s => s.userId === userId && s.active);

        if (!share) return res.json({ ok: true, stopped: false });

        share.active = false;
        await writeDB(db);
        res.json({ ok: true, stopped: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// POST /api/location/update
router.post('/update', auth, async (req, res) => {
    try {
        const { lat, lng, accuracy } = req.body || {};
        const userId = req.user.id;

        if (typeof lat !== 'number' || typeof lng !== 'number') {
            return res.status(400).json({ ok: false, error: 'lat, lng required' });
        }

        const db = await readDB();
        const existing = db.locations.find(l => l.userId === userId);
        const item = { userId, lat, lng, accuracy: accuracy ?? null, updatedAt: nowISO() };

        if (existing) Object.assign(existing, item);
        else db.locations.push(item);

        await writeDB(db);
        res.json({ ok: true, location: item });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// GET /api/location/live-share/:token
router.get('/live-share/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const db = await readDB();
        const share = db.shares.find(s => s.token === token && s.active);

        if (!share) return res.status(404).json({ ok: false, error: 'Invalid or inactive token' });
        if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
            return res.status(410).json({ ok: false, error: 'Share expired' });
        }

        const loc = db.locations.find(l => l.userId === share.userId);
        res.json({ ok: true, userId: share.userId, location: loc || null, token });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// GET /api/location/nearby-users
router.get('/nearby-users', auth, async (req, res) => {
    try {
        const { lat, lng, radius = 1000 } = req.query;
        const userId = req.user.id;

        if (!lat || !lng) return res.status(400).json({ ok: false, error: 'lat and lng required' });

        const db = await readDB();
        const userLocation = db.locations.find(l => l.userId === userId);
        if (!userLocation) return res.status(400).json({ ok: false, error: 'User location not found' });

        const distanceCalc = (lat1, lon1, lat2, lon2) => {
            const R = 6371e3;
            const φ1 = lat1 * Math.PI / 180;
            const φ2 = lat2 * Math.PI / 180;
            const Δφ = (lat2 - lat1) * Math.PI / 180;
            const Δλ = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
            return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        const nearbyUsers = db.locations
            .filter(l => l.userId !== userId)
            .map(l => ({ ...l, distance: distanceCalc(parseFloat(lat), parseFloat(lng), l.lat, l.lng) }))
            .filter(u => u.distance <= radius)
            .sort((a, b) => a.distance - b.distance);

        res.json({ ok: true, nearbyUsers });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// GET /api/location/geocode
router.get('/geocode', async (req, res) => {
    try {
        const { address } = req.query;
        if (!address) return res.status(400).json({ ok: false, error: 'address required' });

        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${config.GOOGLE_API_KEY}`);
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
            const r = data.results[0];
            res.json({ ok: true, location: { lat: r.geometry.location.lat, lng: r.geometry.location.lng, formattedAddress: r.formatted_address } });
        } else {
            res.status(404).json({ ok: false, error: 'Address not found' });
        }
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// GET /api/location/reverse-geocode
router.get('/reverse-geocode', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) return res.status(400).json({ ok: false, error: 'lat and lng required' });

        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${config.GOOGLE_API_KEY}`);
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
            const r = data.results[0];
            res.json({ ok: true, address: r.formatted_address, components: r.address_components });
        } else {
            res.status(404).json({ ok: false, error: 'Location not found' });
        }
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// GET /api/location/directions
router.get('/directions', async (req, res) => {
    try {
        const { origin, destination, mode = 'walking' } = req.query;
        if (!origin || !destination) return res.status(400).json({ ok: false, error: 'origin and destination required' });

        const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}&key=${config.GOOGLE_API_KEY}`);
        const data = await response.json();

        if (data.status === 'OK' && data.routes.length > 0) {
            const r = data.routes[0];
            res.json({ ok: true, route: { summary: r.summary, distance: r.legs[0].distance, duration: r.legs[0].duration, steps: r.legs[0].steps } });
        } else {
            res.status(404).json({ ok: false, error: 'Route not found' });
        }
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// GET /api/location/alerts
router.get('/alerts', async (req, res) => {
    try {
        const db = await readDB();
        const items = [...db.alerts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json({ ok: true, items });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

export default router;
