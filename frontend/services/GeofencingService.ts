import { Platform } from "react-native";
import * as Location from "expo-location";
import axios from "axios";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://192.168.0.100:5000";
export type GeofenceStatus = {
    currentZone: "campus" | "coverage" | "outside";
    distanceFromCenter: number;
};

export type University = {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number; // in meters
};

// 📌 Use IPv4 for Android, localhost for iOS/web
const API_URL =
    Platform.OS === "android"
        ? "http://192.168.0.100:5000/api" // replace with your PC IPv4
        : "http://localhost:5000/api";

class GeofencingService {
    private helpMessage: string = "";

    setHelpMessage(message: string) {
        this.helpMessage = message;
    }

    // ✅ Get geofence status from backend
    async getGeofenceStatus(location: Location.LocationObject): Promise<GeofenceStatus> {
        try {
            const res = await axios.post(`${API_URL}/geofence/status`, {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
            return res.data;
        } catch (err) {
            console.error("❌ Geofence status error:", err);
            throw new Error("Failed to fetch geofence status");
        }
    }

    // ✅ Send emergency help message
    async sendHelpMessage(location: Location.LocationObject): Promise<any> {
        try {
            const res = await axios.post(`${API_URL}/help/send`, {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                message: this.helpMessage || "I need help at my current location!",
            });
            return res.data;
        } catch (err) {
            console.error("❌ Help message error:", err);
            throw new Error("Failed to send help message");
        }
    }

    // ✅ Optional: fetch universities list
    async getAvailableUniversities(): Promise<University[]> {
        try {
            const res = await axios.get(`${API_URL}/universities`);
            return res.data;
        } catch (err) {
            console.error("❌ Failed to fetch universities:", err);
            return [];
        }
    }

    // ✅ Optional: set current university
    async setUniversity(id: string): Promise<University | null> {
        try {
            const res = await axios.post(`${API_URL}/universities/${id}`);
            return res.data.university;
        } catch (err) {
            console.error("❌ Failed to set university:", err);
            return null;
        }
    }
}

export default new GeofencingService();
