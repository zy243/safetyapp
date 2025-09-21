// services/guardianService.ts
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

// Guardian Session Types
export interface GuardianSession {
  id: string;
  sessionId: string;
  destination: string;
  startTime: string;
  estimatedArrival: string;
  isActive: boolean;
  currentLocation: {
    latitude: number;
    longitude: number;
    lastUpdated: string;
  };
  trustedContacts: Array<{
    contactId: string;
    name: string;
    phone: string;
    relationship: string;
    isNotified: boolean;
  }>;
  checkInInterval: number;
  lastCheckIn?: string;
  nextCheckIn?: string;
  status: 'active' | 'completed' | 'cancelled' | 'emergency';
}

export interface StartSessionData {
  destination: string;
  estimatedArrival: string;
  trustedContacts: Array<{
    contactId: string;
    name: string;
    phone: string;
    relationship: string;
  }>;
  checkInInterval?: number;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
}

export interface CheckInResponse {
  response: 'yes' | 'no';
  location?: {
    latitude: number;
    longitude: number;
  };
}

// Guardian Service Functions
export const GuardianService = {
  // Start a new guardian session
  async startSession(data: StartSessionData): Promise<GuardianSession> {
    try {
      const response = await apiRequest('/guardian/start-session', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.session;
    } catch (error) {
      console.error('Start guardian session error:', error);
      throw error;
    }
  },

  // Update current location during session
  async updateLocation(location: LocationUpdate): Promise<void> {
    try {
      await apiRequest('/guardian/update-location', {
        method: 'PUT',
        body: JSON.stringify(location),
      });
    } catch (error) {
      console.error('Update location error:', error);
      throw error;
    }
  },

  // Respond to safety check-in
  async checkIn(data: CheckInResponse): Promise<void> {
    try {
      await apiRequest('/guardian/check-in', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Check-in error:', error);
      throw error;
    }
  },

  // End guardian session
  async endSession(): Promise<void> {
    try {
      await apiRequest('/guardian/end-session', {
        method: 'POST',
      });
    } catch (error) {
      console.error('End session error:', error);
      throw error;
    }
  },

  // Get user's guardian sessions
  async getSessions(page: number = 1, limit: number = 10, status?: string) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(status && { status }),
      });
      
      const response = await apiRequest(`/guardian/sessions?${params}`);
      return response;
    } catch (error) {
      console.error('Get sessions error:', error);
      throw error;
    }
  },

  // Get current active session
  async getActiveSession(): Promise<GuardianSession | null> {
    try {
      const response = await apiRequest('/guardian/active-session');
      return response.session;
    } catch (error: any) {
      if (error.message && error.message.includes('404')) {
        return null;
      }
      console.error('Get active session error:', error);
      throw error;
    }
  },

  // Get sessions monitored by this guardian
  async getMonitoredSessions(page: number = 1, limit: number = 20, status?: string) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(status && { status }),
      });
      
      const response = await apiRequest(`/guardian/monitored-sessions?${params}`);
      return response;
    } catch (error) {
      console.error('Get monitored sessions error:', error);
      throw error;
    }
  },

  // Get session details
  async getSessionDetails(sessionId: string) {
    try {
      const response = await apiRequest(`/guardian/session/${sessionId}`);
      return response.session;
    } catch (error) {
      console.error('Get session details error:', error);
      throw error;
    }
  },

  // Send notification to guardian
  async notifyGuardian(guardianId: string, notificationData: any) {
    try {
      const response = await apiRequest('/guardian/notify', {
        method: 'POST',
        body: JSON.stringify({
          guardianId,
          ...notificationData
        })
      });
      return response;
    } catch (error) {
      console.error('Notify guardian error:', error);
      throw error;
    }
  },
};

export default GuardianService;
