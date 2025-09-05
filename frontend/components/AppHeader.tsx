import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "../contexts/AuthContext"; // <-- your auth context
import { useRouter } from "expo-router";

type AppHeaderProps = {
    title?: string;
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://192.168.0.100:5000";
export default function AppHeader({ title }: AppHeaderProps) {
    const { user, logout } = useAuth(); // <-- from backend auth context
    const router = useRouter();

    const handleLogout = async () => {
        await logout(); // calls backend logout endpoint
        router.replace("/"); // go back to login page
    };

    return (
        <View style={styles.container}>
            <View style={styles.brandRow}>
                <Image
                    source={require("../assets/images/logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.appName}>UniSafe</Text>
            </View>

            {title ? (
                <View style={styles.titleBar}>
                    <Text style={styles.titleText}>{title}</Text>
                    {user && (
                        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                            <Text style={styles.logoutText}>Logout</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#fff",
    },
    brandRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: 16,
        paddingTop: 36,
        paddingBottom: 12,
        justifyContent: "space-between",
    },
    logo: {
        width: 24,
        height: 24,
    },
    appName: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111827",
    },
    titleBar: {
        backgroundColor: "#335499",
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    titleText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    logoutBtn: {
        marginLeft: 12,
        backgroundColor: "#1E88E5",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    logoutText: {
        color: "#fff",
        fontWeight: "600",
    },
});
