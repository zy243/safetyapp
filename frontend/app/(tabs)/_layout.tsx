// app/(tabs)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import AppHeader from "../../components/AppHeader";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://192.168.0.100:5000";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: true,
                header: ({ options }) => <AppHeader title={options.title as string} />,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="map"
                options={{
                    title: "Map",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="map-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="guardian"
                options={{
                    title: "Guardian",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="shield-checkmark-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="report"
                options={{
                    title: "Report",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="create-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="emergency"
                options={{
                    title: "Emergency",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="call-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person-circle-outline" color={color} size={size} />
                    ),
                }}
            />
        </Tabs>
    );
}
