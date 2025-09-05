// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Alert, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { User, LoginCredentials, SignupCredentials } from "../types";

// API base URL (adjust IP to your backend machine IPv4)
const API_URL =
    Platform.OS === "android"
        ? "http://192.168.0.100:5000/api/auth"
        : "http://localhost:5000/api/auth";

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
    signup: (credentials: SignupCredentials) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check if user is logged in on app start
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const userData = await SecureStore.getItemAsync("userData");
            if (userData) {
                const parsedUser: User = JSON.parse(userData);
                setUser(parsedUser);
            }
        } catch (error) {
            console.error("Auth check error:", error);
            Alert.alert("Error", "Failed to check authentication status");
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (credentials: LoginCredentials) => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_URL}/login`, credentials);

            const { token, user } = response.data;

            // Save token + user securely
            await SecureStore.setItemAsync("token", token);
            await SecureStore.setItemAsync("userData", JSON.stringify(user));

            setUser(user);
        } catch (error: any) {
            console.error("Login error:", error);
            Alert.alert("Login Failed", error.response?.data?.message || "Invalid credentials");
            throw new Error(error.message || "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await SecureStore.deleteItemAsync("userData");
            await SecureStore.deleteItemAsync("token");
            setUser(null);
        } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to logout");
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (credentials: SignupCredentials) => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_URL}/signup`, credentials);

            const { token, user } = response.data;

            await SecureStore.setItemAsync("token", token);
            await SecureStore.setItemAsync("userData", JSON.stringify(user));

            setUser(user);
        } catch (error: any) {
            console.error("Signup error:", error);
            Alert.alert("Signup Failed", error.response?.data?.message || "Unable to signup");
            throw new Error(error.message || "Signup failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, signup }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
