// services/apiService.ts
import * as SecureStore from 'expo-secure-store';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// API Helper Functions
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = await SecureStore.getItemAsync('authToken');
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Student API Service
export const StudentService = {
  // Get student profile
  async getProfile() {
    return apiRequest('/student/profile');
  },

  // Update student profile
  async updateProfile(profileData: any) {
    return apiRequest('/student/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Send SOS alert
  async sendSOS(data: { location: { latitude: number; longitude: number }; description?: string; media?: any[] }) {
    return apiRequest('/student/sos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get SOS history
  async getSOSHistory(page: number = 1, limit: number = 10) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    return apiRequest(`/student/sos-history?${params}`);
  },

  // Get guardian sessions
  async getGuardianSessions(page: number = 1, limit: number = 10, status?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
    });
    return apiRequest(`/student/guardian-sessions?${params}`);
  },

  // Get student dashboard
  async getDashboard() {
    return apiRequest('/student/dashboard');
  },
};

// Staff API Service
export const StaffService = {
  // Get SOS monitoring data
  async getSOSMonitoring(page: number = 1, limit: number = 20, status?: string, priority?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
      ...(priority && { priority }),
    });
    return apiRequest(`/staff/sos-monitoring?${params}`);
  },

  // Acknowledge SOS alert
  async acknowledgeSOSAlert(alertId: string, notes?: string) {
    return apiRequest(`/staff/sos-alert/${alertId}/acknowledge`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  },

  // Resolve SOS alert
  async resolveSOSAlert(alertId: string, resolution: string, notes?: string) {
    return apiRequest(`/staff/sos-alert/${alertId}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ resolution, notes }),
    });
  },

  // Get guardian sessions for monitoring
  async getGuardianSessions(page: number = 1, limit: number = 20, status?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
    });
    return apiRequest(`/staff/guardian-sessions?${params}`);
  },

  // Get specific guardian session
  async getGuardianSession(sessionId: string) {
    return apiRequest(`/staff/guardian-session/${sessionId}`);
  },

  // Get staff dashboard
  async getDashboard() {
    return apiRequest('/staff/dashboard');
  },

  // Get all students
  async getStudents(page: number = 1, limit: number = 20, search?: string, university?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(university && { university }),
    });
    return apiRequest(`/staff/students?${params}`);
  },

  // Get specific student details
  async getStudent(studentId: string) {
    return apiRequest(`/staff/student/${studentId}`);
  },
};

// Guardian API Service
export const GuardianService = {
  // Start guardian session
  async startSession(data: any) {
    return apiRequest('/guardian/start-session', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update location
  async updateLocation(location: { latitude: number; longitude: number }) {
    return apiRequest('/guardian/update-location', {
      method: 'PUT',
      body: JSON.stringify(location),
    });
  },

  // Check in
  async checkIn(data: { response: 'yes' | 'no'; location?: { latitude: number; longitude: number } }) {
    return apiRequest('/guardian/check-in', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // End session
  async endSession() {
    return apiRequest('/guardian/end-session', {
      method: 'POST',
    });
  },

  // Get sessions
  async getSessions(page: number = 1, limit: number = 10, status?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
    });
    return apiRequest(`/guardian/sessions?${params}`);
  },

  // Get active session
  async getActiveSession() {
    return apiRequest('/guardian/active-session');
  },
};

// Notification API Service
export const NotificationService = {
  // Get notifications
  async getNotifications(page: number = 1, limit: number = 20, isRead?: boolean, type?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(isRead !== undefined && { isRead: isRead.toString() }),
      ...(type && { type }),
    });
    return apiRequest(`/notifications?${params}`);
  },

  // Mark notification as read
  async markAsRead(notificationId: string) {
    return apiRequest(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },

  // Mark all notifications as read
  async markAllAsRead() {
    return apiRequest('/notifications/read-all', {
      method: 'PUT',
    });
  },

  // Delete notification
  async deleteNotification(notificationId: string) {
    return apiRequest(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },

  // Get unread count
  async getUnreadCount() {
    return apiRequest('/notifications/unread-count');
  },

  // Get notification stats
  async getStats() {
    return apiRequest('/notifications/stats');
  },
};

// Auth API Service
export const AuthService = {
  // Register
  async register(data: any) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Login
  async login(data: any) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get current user
  async getMe() {
    return apiRequest('/auth/me');
  },

  // Update profile
  async updateProfile(data: any) {
    return apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Update push token
  async updatePushToken(pushToken: string) {
    return apiRequest('/auth/push-token', {
      method: 'POST',
      body: JSON.stringify({ pushToken }),
    });
  },

  // Logout
  async logout() {
    return apiRequest('/auth/logout', {
      method: 'POST',
    });
  },
};

export default {
  StudentService,
  StaffService,
  GuardianService,
  NotificationService,
  AuthService,
};
