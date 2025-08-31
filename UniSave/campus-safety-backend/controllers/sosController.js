// controllers/sosController.js
import SOSAlert from '../models/SOSAlert.js';

import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

async function sendSMS(to, message) {
    try {
        await client.messages.create({
            body: message,
            from: TWILIO_PHONE_NUMBER,
            to: to
        });
        console.log('SMS sent to', to);
    } catch (err) {
        console.error('SMS error:', err);
    }
}



// Create SOS alert
// ✅ Correct sosController.js
export const sendAlert = async (req, res) => {
    try {
        // Example: save SOS alert
        const alert = {
            user: req.user ? req.user.id : "anonymous",
            location: req.body.location,
            timestamp: new Date(),
        };

        // save to DB or log
        console.log("SOS Alert Created:", alert);

        res.status(201).json({ message: "SOS alert sent", alert });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get recent alerts
export const getAlerts = async (req, res) => {
    try {
        const alerts = await SOSAlert.find()
            .populate("user", "name role")
            .populate("handledBy", "name role")
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ alerts });
    } catch (err) {
        console.error("GetAlerts error:", err);
        res.status(500).json({ error: "Server error" });
    }
};
