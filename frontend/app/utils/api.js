// app/utils/api.js
import axios from 'axios';
import Constants from 'expo-constants';

// ---------------------------
// Backend URL
// ---------------------------
const BACKEND_URL = Constants.manifest.extra?.BACKEND_URL || 'http://localhost:5000';

// ---------------------------
// Axios instance with cookies
// ---------------------------
export const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: send cookies/session
});

// ---------------------------
// API FUNCTIONS
// ---------------------------

// 1️⃣ Health check
export const checkHealth = async () => {
  try {
    const response = await api.get('/api/health');
    return response.data;
  } catch (error) {
    console.error('Health check error:', error.response?.data || error.message);
    throw error;
  }
};

// 2️⃣ Auth: login & register
export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error;
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  } catch (error) {
    console.error('Register error:', error.response?.data || error.message);
    throw error;
  }
};

// 3️⃣ SOS reports
export const sendSOS = async (sosData) => {
  try {
    const response = await api.post('/api/sos', sosData);
    return response.data;
  } catch (error) {
    console.error('Send SOS error:', error.response?.data || error.message);
    throw error;
  }
};

// 4️⃣ Guardian
export const getGuardians = async () => {
  try {
    const response = await api.get('/api/guardian');
    return response.data;
  } catch (error) {
    console.error('Get Guardians error:', error.response?.data || error.message);
    throw error;
  }
};

// 5️⃣ Incidents
export const getIncidents = async () => {
  try {
    const response = await api.get('/api/incidents');
    return response.data;
  } catch (error) {
    console.error('Get Incidents error:', error.response?.data || error.message);
    throw error;
  }
};

export const createIncident = async (incidentData) => {
  try {
    const response = await api.post('/api/incidents', incidentData);
    return response.data;
  } catch (error) {
    console.error('Create Incident error:', error.response?.data || error.message);
    throw error;
  }
};

// 6️⃣ Users
export const getUsers = async () => {
  try {
    const response = await api.get('/api/users');
    return response.data;
  } catch (error) {
    console.error('Get Users error:', error.response?.data || error.message);
    throw error;
  }
};

// 7️⃣ Google OAuth
// Note: backend handles redirect flow, here we just call the endpoint for token exchange if needed
export const googleOAuth = async (token) => {
  try {
    const response = await api.post('/auth/google', { token });
    return response.data;
  } catch (error) {
    console.error('Google OAuth error:', error.response?.data || error.message);
    throw error;
  }
};
