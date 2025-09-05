import React, { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { speakPageTitle, speakButtonAction } from "../../services/SpeechService";
import { LinearGradient } from "expo-linear-gradient";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://192.168.0.100:5000";

type Contact = {
    id: number;
    name: string;
    phone: string;
    type: "emergency" | "campus" | "health";
};

function confirmAndCall(phone: string, contactName: string) {
    Alert.alert(
        "Confirm Call",
        `Are you sure you want to call ${contactName}?`,
        [
            { text: "Cancel", style: "cancel" },
            {
                text: "Call",
                style: "destructive",
                onPress: () => {
                    speakButtonAction(`Calling ${contactName}`);
                    const url = Platform.select({ ios: `telprompt:${phone}`, default: `tel:${phone}` });
                    Linking.openURL(url || `tel:${phone}`).catch(() => {
                        speakButtonAction("Cannot place call. Check your device call permissions.");
                        Alert.alert("Cannot place call", "Check your device call permissions.");
                    });
                },
            },
        ]
    );
}

export default function EmergencyCallScreen() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            speakPageTitle("Emergency Contacts");
        }, [])
    );

    useEffect(() => {
        async function fetchContacts() {
            try {
                const res = await fetch(`${BACKEND_URL}/api/emergency`);
                const data = await res.json();
                setContacts(data);
            } catch (err) {
                console.error("Failed to fetch contacts", err);
            } finally {
                setLoading(false);
            }
        }
        fetchContacts();
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text>Loading contacts...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <LinearGradient colors={["#2563eb", "#1d4ed8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <Ionicons name="alert-circle" size={36} color="#fff" />
                <Text style={styles.headerTitle}>Emergency Contacts</Text>
                <Text style={styles.headerSubtitle}>Quickly reach campus & public safety services</Text>
            </LinearGradient>

            {contacts.map((c) => (
                <TouchableOpacity
                    key={c.id}
                    style={[styles.card, c.type === "emergency" ? styles.emergencyCard : styles.standardCard]}
                    onPress={() => confirmAndCall(c.phone, c.name)}
                >
                    <View style={styles.cardContent}>
                        <Ionicons name="call" size={22} color={c.type === "emergency" ? "#dc2626" : "#1e40af"} />
                        <View style={styles.textContainer}>
                            <Text style={styles.cardText}>{c.name}</Text>
                            <Text style={styles.cardSubtext}>{c.phone}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    </View>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f9fafb" 
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  // Header - made smaller
  header: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  headerIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: "800", 
    color: "#fff", 
    marginBottom: 4,
    textAlign: 'center'
  },
  headerSubtitle: { 
    fontSize: 14, 
    color: "#e0f2fe", 
    textAlign: 'center',
    paddingHorizontal: 10,
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    marginLeft: 8,
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '500',
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
    marginLeft: 4,
  },

  // Cards
  card: {
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  emergencyCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  standardCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  cardText: { 
    fontSize: 17, 
    fontWeight: "600", 
    color: "#111827",
    marginBottom: 2,
  },
  cardSubtext: {
    fontSize: 13,
    color: "#6b7280",
  },
  chevron: {
    marginLeft: 'auto'
  },

  // Icon circle
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },

  // Footer
  footer: {
    backgroundColor: '#e0f2fe',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  footerText: {
    fontSize: 13,
    color: '#1e40af',
    textAlign: 'center',
    lineHeight: 20,
  },
});