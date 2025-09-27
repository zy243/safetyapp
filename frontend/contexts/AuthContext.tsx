import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { User, LoginCredentials, SignupCredentials, University } from '../types';
import { API_BASE_URL } from '@env';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
    signup: (credentials: SignupCredentials) => Promise<void>;
    isSecurity: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // API request helper
    const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
        const token = await SecureStore.getItemAsync('authToken');

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers,
            },
            ...options,
        };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }

        return data;
    };

    // Check if user is logged in on app start
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const token = await SecureStore.getItemAsync('authToken');
            const userData = await SecureStore.getItemAsync('userData');

            if (token && userData) {
                // Verify token is still valid by fetching user profile
                try {
                    const data = await apiRequest('/users/me');
                    setUser(data.user);
                } catch (error) {
                    // Token is invalid, clear storage
                    await SecureStore.deleteItemAsync('authToken');
                    await SecureStore.deleteItemAsync('userData');
                    setUser(null);
                }
            }
        } catch (error) {
            console.error('Auth check error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (credentials: LoginCredentials) => {
        setIsLoading(true);
        try {
            const data = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials),
            });

            if (data.success) {
                setUser(data.user);
                await SecureStore.setItemAsync('authToken', data.token);
                await SecureStore.setItemAsync('userData', JSON.stringify(data.user));
            } else {
                throw new Error(data.message || 'Login failed');
            }
        } catch (error: any) {
            throw new Error(error.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (credentials: SignupCredentials) => {
        setIsLoading(true);
        try {
            const data = await apiRequest('/auth/signup', {
                method: 'POST',
                body: JSON.stringify({
                    name: credentials.name,
                    email: credentials.email,
                    password: credentials.password,
                    role: credentials.role,
                    universityId: credentials.university?.id,
                }),
            });

            if (data.success) {
                setUser(data.user);
                await SecureStore.setItemAsync('authToken', data.token);
                await SecureStore.setItemAsync('userData', JSON.stringify(data.user));
            } else {
                throw new Error(data.message || 'Signup failed');
            }
        } catch (error: any) {
            throw new Error(error.message || 'Signup failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            setUser(null);
            await SecureStore.deleteItemAsync('authToken');
            await SecureStore.deleteItemAsync('userData');
        } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to logout');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            login,
            logout,
            signup,
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