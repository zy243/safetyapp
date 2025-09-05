import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { getBackendStatus } from '../services/StatusService';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://192.168.0.100:5000";
interface LoadingScreenProps {
    message?: string;
}

export default function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
    const [backendMessage, setBackendMessage] = useState<string>("Checking backend...");

    useEffect(() => {
        const checkStatus = async () => {
            const status = await getBackendStatus();
            setBackendMessage(status.ok ? status.message : "Backend not available");
        };
        checkStatus();
    }, []);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#1e40af" />
            <Text style={styles.text}>{message}</Text>
            <Text style={styles.backendText}>{backendMessage}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    text: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748b',
    },
    backendText: {
        marginTop: 8,
        fontSize: 14,
        color: '#334155',
    },
});
