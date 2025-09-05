// contexts/GuardianContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Alert, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { Guardian } from "../types"; // <-- define Guardian type in your /types

// API base URL
const API_URL =
    Platform.OS === "android"
        ? "http://192.168.0.100:5000/api/guardians"
        : "http://localhost:5000/api/guardians";

interface GuardianContextType {
    guardians: Guardian[];
    isLoading: boolean;
    fetchGuardians: () => Promise<void>;
    addGuardian: (guardian: Partial<Guardian>) => Promise<void>;
    removeGuardian: (guardianId: string) => Promise<void>;
}

const GuardianContext = createContext < GuardianContextType | undefined > (undefined);

interface GuardianProviderProps {
    children: ReactNode;
}

export function GuardianProvider({ children }: GuardianProviderProps) {
    const [guardians, setGuardians] = useState < Guardian[] > ([]);
    const [isLoading, setIsLoading] = useState(false);

    // Load guardians when component mounts
    useEffect(() => {
        fetchGuardians();
    }, []);

    const fetchGuardians = async () => {
        setIsLoading(true);
        try {
            const token = await SecureStore.getItemAsync("token");
            const response = await axios.get(API_URL, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setGuardians(response.data.guardians || []);
        } catch (error: any) {
            console.error("Fetch guardians error:", error);
            Alert.alert("Error", "Failed to load guardians.");
        } finally {
            setIsLoading(false);
        }
    };

    const addGuardian = async (guardian: Partial<Guardian>) => {
        setIsLoading(true);
        try {
            const token = await SecureStore.getItemAsync("token");
            const response = await axios.post(API_URL, guardian, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setGuardians((prev) => [...prev, response.data.guardian]);
        } catch (error: any) {
            console.error("Add guardian error:", error);
            Alert.alert("Error", error.response?.data?.message || "Failed to add guardian");
        } finally {
            setIsLoading(false);
        }
    };

    const removeGuardian = async (guardianId: string) => {
        setIsLoading(true);
        try {
            const token = await SecureStore.getItemAsync("token");
            await axios.delete(`${API_URL}/${guardianId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setGuardians((prev) => prev.filter((g) => g.id !== guardianId));
        } catch (error: any) {
            console.error("Remove guardian error:", error);
            Alert.alert("Error", error.response?.data?.message || "Failed to remove guardian");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <GuardianContext.Provider
            value={{ guardians, isLoading, fetchGuardians, addGuardian, removeGuardian }}
        >
            {children}
        </GuardianContext.Provider>
    );
}

export function useGuardians() {
    const context = useContext(GuardianContext);
    if (context === undefined) {
        throw new Error("useGuardians must be used within a GuardianProvider");
    }
    return context;
}
