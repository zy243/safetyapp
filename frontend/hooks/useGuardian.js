// frontend/hooks/useGuardian.js
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';
import { BACKEND_URL } from '@env'; // make sure your .env has EXPO_PUBLIC_BACKEND_URL

export default function useGuardian() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation();

    // Fetch user info from AsyncStorage or backend
    const loadUser = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                setUser(null);
                navigation.replace('/login'); // redirect to login
                return;
            }

            // Verify token with backend
            const res = await fetch(`${BACKEND_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                // Invalid token
                await AsyncStorage.removeItem('token');
                setUser(null);
                navigation.replace('/login');
            }
        } catch (err) {
            console.error('Guardian loadUser error:', err);
            setUser(null);
            navigation.replace('/login');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUser();
    }, []);

    // Logout function
    const logout = async () => {
        await AsyncStorage.removeItem('token');
        setUser(null);
        navigation.replace('/login');
    };

    return { user, loading, logout };
}
