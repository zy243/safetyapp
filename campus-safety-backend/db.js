const fs = require('fs').promises;
const path = require('path');

const DB_FILE = process.env.DB_FILE || path.resolve(__dirname, '../data.json'); // safer path resolution

const defaultData = {
    users: [],        // { id, email, name }
    reports: [],      // { id, userName, category, description, attachments[], createdAt }
    escorts: [],      // { id, userName, destination, durationMinutes, expectedEnd, startTime, status, guardianEmails[], shareToken, completedAt, alertedAt }
    shares: [],       // { token, userName, active, createdAt, expiresAt }
    locations: [],    // { userName, lat, lng, accuracy, updatedAt }
    alerts: []        // { id, type, message, createdAt, sessionId, guardians: [] }
};

// Ensure the DB file exists; if not, create it with defaultData
async function ensureDB() {
    try {
        await fs.access(DB_FILE);
    } catch (err) {
        await fs.writeFile(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    }
}

// Read DB content safely
async function readDB() {
    await ensureDB();
    try {
        const raw = await fs.readFile(DB_FILE, 'utf-8');
        const data = JSON.parse(raw);

        // Ensure all required keys exist
        for (const key of Object.keys(defaultData)) {
            if (!Object.prototype.hasOwnProperty.call(data, key)) {
                data[key] = Array.isArray(defaultData[key]) ? [] : defaultData[key];
            }
        }

        return data;
    } catch (err) {
        console.error('Error reading DB, resetting to defaultData:', err);
        await fs.writeFile(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
        return JSON.parse(JSON.stringify(defaultData));
    }
}

// Write data to DB file
async function writeDB(data) {
    try {
        await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('Error writing DB file:', err);
        throw err;
    }
}

module.exports = {
    ensureDB,
    readDB,
    writeDB,
};
