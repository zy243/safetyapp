// app/_layout.tsx
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { GuardianProvider } from "../contexts/GuardianContext";
import LoadingScreen from "../components/LoadingScreen";
import { checkAuth } from "../services/api"; // call backend API

function LayoutContent() {
    const { isLoading, user, setUser, setIsLoading } = useAuth();

    // 🔹 On first load, check backend for logged-in user
    useEffect(() => {
        async function fetchUser() {
            try {
                const data = await checkAuth(); // GET /api/auth/check
                if (data?.user) {
                    setUser(data.user); // backend user object
                }
            } catch (err) {
                console.log("Auth check failed:", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchUser();
    }, []);

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            {!user ? (
                // If no user, show login/index page
                <Stack.Screen name="index" />
            ) : (
                // If logged in, show tabs/dashboard
                <Stack.Screen name="(tabs)" />
            )}
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <GuardianProvider>
                <LayoutContent />
            </GuardianProvider>
        </AuthProvider>
    );
}
