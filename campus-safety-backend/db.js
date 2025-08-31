// db.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = process.env.DB_FILE || path.resolve(__dirname, '../data.json');

const defaultData = {
    users: [],
    reports: [],
    escorts: [],
    shares: [],
    locations: [],
    alerts: []
};

// Ensure DB file exists
export async function ensureDB() {
    try {
        await fs.access(DB_FILE);
    } catch (err) {
        console.log(`DB not found. Creating new DB at ${DB_FILE}`);
        await fs.writeFile(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    }
}

// Read DB safely
export async function readDB() {
    await ensureDB();
    try {
        const raw = await fs.readFile(DB_FILE, 'utf-8');
        const data = JSON.parse(raw);

        // Make sure all keys exist
        for (const key of Object.keys(defaultData)) {
            if (!Object.prototype.hasOwnProperty.call(data, key)) {
                data[key] = [];
            }
        }

        return data;
    } catch (err) {
        console.error('Error reading DB, resetting to defaultData:', err);
        await fs.writeFile(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
        return JSON.parse(JSON.stringify(defaultData));
    }
}

// Write DB
export async function writeDB(data) {
    try {
        await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('Error writing DB file:', err);
        throw err;
    }
}
