// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { User, LoginCredentials, SignupCredentials } from '../types';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';



interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
  updatePushToken: (pushToken: string) => Promise<void>;
  isSecurity: boolean; // convenience flag
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        // Verify token with backend
        const response = await apiRequest('/auth/me');
        setUser(response.user);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Clear invalid token
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('userData');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      const { token, user: userData } = response;
      
      // Store token and user data
      await SecureStore.setItemAsync('authToken', token);
      await SecureStore.setItemAsync('userData', JSON.stringify(userData));
      
      setUser(userData);
      
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Call logout endpoint
      try {
        await apiRequest('/auth/logout', { method: 'POST' });
      } catch (error) {
        // Continue with logout even if API call fails
        console.warn('Logout API call failed:', error);
      }
      
      // Clear local storage
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('userData');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      const { token, user: userData } = response;
      
      // Store token and user data
      await SecureStore.setItemAsync('authToken', token);
      await SecureStore.setItemAsync('userData', JSON.stringify(userData));
      
      setUser(userData);
      
    } catch (error: any) {
      throw new Error(error.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      const response = await apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });

      const { user: updatedUser } = response;
      
      // Update stored user data
      await SecureStore.setItemAsync('userData', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
    } catch (error: any) {
      throw new Error(error.message || 'Profile update failed');
    }
  };

  const updatePushToken = async (pushToken: string) => {
    try {
      await apiRequest('/auth/push-token', {
        method: 'POST',
        body: JSON.stringify({ pushToken }),
      });
    } catch (error: any) {
      console.warn('Failed to update push token:', error.message);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      logout, 
      signup, 
      updateProfile,
      updatePushToken,
      isSecurity: !!(user && (user.role === 'security' || user.role === 'admin')) 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}