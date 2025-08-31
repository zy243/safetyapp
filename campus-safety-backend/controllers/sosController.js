// controllers/sosController.js
import SOSAlert from "../models/SOSAlert.js";
import twilio from "twilio";

// Twilio setup
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Helper: Send SMS
async function sendSMS(to, message) {
    try {
        await client.messages.create({ body: message, from: TWILIO_PHONE_NUMBER, to });
        console.log("SMS sent to", to);
    } catch (err) {
        console.error("SMS error:", err);
    }
}

// Create SOS alert
export const sendAlert = async (req, res) => {
    try {
        const alert = {
            user: req.user ? req.user.id : "anonymous",
            location: req.body.location,
            timestamp: new Date(),
        };

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
