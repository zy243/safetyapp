import { Router } from 'express';
import { nanoid } from 'nanoid';
import { readDB, writeDB } from '../db.js';
import { notifyGuardians } from '../utils/notifier.js';

const router = Router();

const minutesFromNow = (mins) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + Number(mins || 0));
    return d.toISOString();
};

const nowISO = () => new Date().toISOString();

// POST /api/escort-sessions
router.post('/escort-sessions', async (req, res) => {
    const { userName, destination, durationMinutes, guardianEmails } = req.body || {};
    if (!userName || !destination || typeof durationMinutes !== 'number') {
        return res.status(400).json({ ok: false, error: 'userName, destination, durationMinutes required' });
    }

    const guardians = Array.isArray(guardianEmails) ? guardianEmails.filter(Boolean) : [];
    const db = await readDB();

    let share = db.shares.find(s => s.userName === userName && s.active);
    if (!share) {
        share = {
            token: nanoid(16),
            userName,
            active: true,
            createdAt: nowISO(),
            expiresAt: null
        };
        db.shares.push(share);
    }

    const session = {
        id: nanoid(12),
        userName,
        destination,
        durationMinutes,
        expectedEnd: minutesFromNow(durationMinutes),
        startTime: nowISO(),
        status: 'active',
        guardianEmails: guardians,
        shareToken: share.token,
        completedAt: null,
        alertedAt: null
    };

    db.escorts.push(session);
    await writeDB(db);

    const base = (process.env.PUBLIC_BASE_URL || process.env.BASE_URL || '').replace(/\/$/, '');
    const shareUrl = base ? `${base}/api/live-share/${share.token}` : `/api/live-share/${share.token}`;

    res.json({ ok: true, session, shareUrl });
});

// PATCH /escort-sessions/:id/complete
router.patch('/escort-sessions/:id/complete', async (req, res) => {
    const { id } = req.params;
    const db = await readDB();
    const sess = db.escorts.find(e => e.id === id);
    if (!sess) return res.status(404).json({ ok: false, error: 'Not found' });
    sess.status = 'completed';
    sess.completedAt = nowISO();
    await writeDB(db);
    res.json({ ok: true, session: sess });
});

// PATCH /escort-sessions/:id/cancel
router.patch('/escort-sessions/:id/cancel', async (req, res) => {
    const { id } = req.params;
    const db = await readDB();
    const sess = db.escorts.find(e => e.id === id);
    if (!sess) return res.status(404).json({ ok: false, error: 'Not found' });
    sess.status = 'cancelled';
    sess.completedAt = nowISO();
    await writeDB(db);
    res.json({ ok: true, session: sess });
});

// GET /escort-sessions/:id
router.get('/escort-sessions/:id', async (req, res) => {
    const { id } = req.params;
    const db = await readDB();
    const sess = db.escorts.find(e => e.id === id);
    if (!sess) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, session: sess });
});

// GET /escort-sessions
router.get('/escort-sessions', async (req, res) => {
    const db = await readDB();
    const items = [...db.escorts].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    res.json({ ok: true, items });
});

let intervalHandle = null;
export function checkOverdueLoop() {
    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = setInterval(async () => {
        try {
            const db = await readDB();
            const now = new Date();
            let changed = false;
            for (const sess of db.escorts) {
                if (sess.status === 'active') {
                    const expected = new Date(sess.expectedEnd);
                    if (now > expected) {
                        console.log(`[OVERDUE] Session ${sess.id} for user ${sess.userName} is overdue!`);
                        sess.status = 'overdue';
                        sess.alertedAt = nowISO();
                        db.alerts.push({
                            id: nanoid(12),
                            type: 'escort_overdue',
                            message: `User ${sess.userName} did not arrive at ${sess.destination} in time.`,
                            createdAt: nowISO(),
                            sessionId: sess.id,
                            guardians: sess.guardianEmails
                        });
                        await notifyGuardians(sess.guardianEmails, `Guardian alert: ${sess.userName} is overdue for ${sess.destination}.`, { sessionId: sess.id });
                        changed = true;
                    }
                }
            }
            if (changed) await writeDB(db);
        } catch (e) {
            console.error('Overdue loop error:', e.message);
        }
    }, 60 * 1000);
}

export default router;
