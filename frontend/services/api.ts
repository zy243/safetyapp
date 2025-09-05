// services/api.ts
import axios from "axios";

// 🔹 Base URL from environment or default
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://192.168.0.100:5000";

// Create an axios instance
const api = axios.create({
    baseURL: BACKEND_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // allows cookies if backend uses them
});

// ------------------- General GET Request -------------------
export const getRequest = async (endpoint: string, params?: any) => {
    try {
        const response = await api.get(endpoint, { params });
        return response.data;
    } catch (err: any) {
        console.error(`GET ${endpoint} failed:`, err.response?.data || err.message);
        throw err;
    }
};

// ------------------- General POST Request -------------------
export const postRequest = async (endpoint: string, body?: any) => {
    try {
        const response = await api.post(endpoint, body);
        return response.data;
    } catch (err: any) {
        console.error(`POST ${endpoint} failed:`, err.response?.data || err.message);
        throw err;
    }
};

// ------------------- Login User -------------------
export const loginUser = async (email: string, password: string) => {
    return postRequest("/api/auth/login", { email, password });
};

// ------------------- Check Auth -------------------
export const checkAuth = async () => {
    return getRequest("/api/auth/check");
};

// ------------------- Get User Profile -------------------
export const getUserProfile = async () => {
    return getRequest("/api/users/profile");
};

// ------------------- Logout -------------------
export const logoutUser = async () => {
    return postRequest("/api/auth/logout");
};

// ------------------- Example: Guardian APIs -------------------
export const getGuardians = async () => {
    return getRequest("/api/guardians");
};

export const addGuardian = async (guardianData: any) => {
    return postRequest("/api/guardians", guardianData);
};
