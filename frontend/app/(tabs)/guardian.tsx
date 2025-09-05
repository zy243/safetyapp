import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    SafeAreaView,
    Modal,
    TextInput,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import TextInputWithVoice from '../../components/TextInputWithVoice';
import {
    speakPageTitle,
    speakButtonAction,
    speakGuardianStatus
} from '../../services/SpeechService';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://192.168.0.100:5000";

const { width, height } = Dimensions.get('window');

interface GuardianSession {
    id: string;
    startTime: Date;
    destination: string;
    estimatedArrival: Date;
    isActive: boolean;
    route: Array<{ latitude: number; longitude: number }>;
    trustedContacts: string[];
}



export default function GuardianScreen() {
    const [guardianSession, setGuardianSession] = useState<GuardianSession | null>(null);
    const [showStartModal, setShowStartModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [destination, setDestination] = useState('');
    const [trustedContacts, setTrustedContacts] = useState<Array<{ id: string; name: string; relationship: string }>>([]);
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [checkInInterval, setCheckInInterval] = useState(5); // minutes
    const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
    const [nextCheckIn, setNextCheckIn] = useState<Date | null>(null);
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);

    const pulseAnimation = useRef(new Animated.Value(1)).current;

    useFocusEffect(
        useCallback(() => {
            speakPageTitle('Guardian Mode');
            fetchTrustedContacts();
        }, [])
    );

    useEffect(() => {
        if (guardianSession?.isActive) {
            startCheckInTimer();
            startLocationTracking();
        }
    }, [guardianSession]);

    useEffect(() => {
        if (nextCheckIn && new Date() >= nextCheckIn) {
            showSafetyCheckIn();
        }
    }, [nextCheckIn]);

    // -----------------------
    // Backend Integration
    // -----------------------

    const fetchTrustedContacts = async () => {
        try {
            const res = await fetch(`${API_BASE}/contacts`);
            const data = await res.json();
            setTrustedContacts(data.contacts);
        } catch (err) {
            console.error('Failed to fetch contacts:', err);
        }
    };

    const handleStartGuardian = async () => {
        if (!destination.trim() || selectedContacts.length === 0) {
            speakButtonAction('Please enter destination and select trusted contacts');
            Alert.alert('Missing Information', 'Please enter destination and select trusted contacts');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/guardian/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destination,
                    trustedContacts: selectedContacts,
                    estimatedArrival: new Date(Date.now() + 30 * 60000), // 30 min ETA
                    route: routeCoordinates,
                }),
            });
            const data = await res.json();
            setGuardianSession(data.session);
            setShowStartModal(false);
            setDestination('');
            setSelectedContacts([]);
            speakGuardianStatus(`Guardian mode activated. Security monitoring your path to ${data.session.destination}`);
            Alert.alert(
                'Guardian Mode Activated',
                `Your trusted contacts have been notified. They can now monitor your journey to ${data.session.destination}.`
            );
        } catch (err) {
            console.error('Failed to start guardian session:', err);
            Alert.alert('Error', 'Could not start Guardian session');
        }
    };

    const handleStopGuardian = async () => {
        if (!guardianSession) return;

        Alert.alert(
            'Stop Guardian Mode',
            'Are you sure you want to stop Guardian mode? Your trusted contacts will be notified.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Stop',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await fetch(`${API_BASE}/guardian/stop`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ sessionId: guardianSession.id }),
                            });
                        } catch (err) {
                            console.error('Failed to stop guardian session:', err);
                        }
                        setGuardianSession(null);
                        setCurrentLocation(null);
                        setRouteCoordinates([]);
                        setLastCheckIn(null);
                        setNextCheckIn(null);
                        Alert.alert('Guardian Mode Stopped', 'Your journey monitoring has been stopped.');
                    },
                },
            ]
        );
    };

    const handleCheckInResponse = async (response: 'yes' | 'no') => {
        if (!guardianSession) return;
        setLastCheckIn(new Date());
        setShowCheckInModal(false);
        pulseAnimation.stopAnimation();

        try {
            await fetch(`${API_BASE}/guardian/checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: guardianSession.id, response }),
            });
        } catch (err) {
            console.error('Failed to send check-in:', err);
        }

        if (response === 'yes') {
            const next = new Date(Date.now() + checkInInterval * 60000);
            setNextCheckIn(next);
            Alert.alert('Check-in Complete', 'Thank you! Stay safe on your journey.');
        } else {
            try {
                await fetch(`${API_BASE}/guardian/emergency`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: guardianSession.id }),
                });
            } catch (err) {
                console.error('Failed to trigger emergency:', err);
            }
            Alert.alert('Help Requested', 'Your trusted contacts and campus security have been notified immediately.');
        }
    };

    // -----------------------
    // Location & Timer
    // -----------------------
    const startCheckInTimer = () => {
        const interval = setInterval(() => {
            const now = new Date();
            const next = new Date(now.getTime() + checkInInterval * 60000);
            setNextCheckIn(next);
        }, 1000);
        return () => clearInterval(interval);
    };

    const startLocationTracking = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Location permission is required for Guardian mode');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            setCurrentLocation(location);

            // Mock route generation
            const mockRoute = [
                { latitude: location.coords.latitude, longitude: location.coords.longitude },
                { latitude: location.coords.latitude + 0.001, longitude: location.coords.longitude + 0.001 },
                { latitude: location.coords.latitude + 0.002, longitude: location.coords.longitude + 0.002 },
            ];
            setRouteCoordinates(mockRoute);
        } catch (error) {
            console.error('Error starting location tracking:', error);
        }
    };

    const showSafetyCheckIn = () => {
        setShowCheckInModal(true);
        startPulseAnimation();
    };

    const startPulseAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnimation, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnimation, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        ).start();
    };

    const toggleContactSelection = (contactId: string) => {
        setSelectedContacts(prev => prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]);
    };

    // -----------------------
    // ETA & Progress
    // -----------------------
    const getEstimatedTime = () => {
        if (!guardianSession) return '';
        const now = new Date();
        const diff = new Date(guardianSession.estimatedArrival).getTime() - now.getTime();
        const minutes = Math.max(0, Math.floor(diff / 60000));
        return `${minutes} min`;
    };

    const getProgressPercentage = () => {
        if (!guardianSession) return 0;
        const now = new Date();
        const total = new Date(guardianSession.estimatedArrival).getTime() - new Date(guardianSession.startTime).getTime();
        const elapsed = now.getTime() - new Date(guardianSession.startTime).getTime();
        return Math.min(100, Math.max(0, (elapsed / total) * 100));
    };

    // -----------------------
    // JSX (UI) remains the same, only replace `mockTrustedContacts` with `trustedContacts`
    // -----------------------
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Virtual Guardian</Text>
                    <Text style={styles.subtitle}>Stay safe on your journey</Text>
                </View>

                {/* Guardian Status */}
                {guardianSession?.isActive ? (
                    <View style={styles.activeSessionContainer}>
                        <View style={styles.sessionHeader}>
                            <Ionicons name="shield-checkmark" size={24} color="#34C759" />
                            <Text style={styles.sessionTitle}>Guardian Active</Text>
                            <TouchableOpacity onPress={handleStopGuardian}>
                                <Ionicons name="stop-circle" size={24} color="#FF3B30" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.sessionInfo}>
                            <Text style={styles.destinationText}>To: {guardianSession.destination}</Text>
                            <Text style={styles.timeText}>ETA: {getEstimatedTime()}</Text>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${getProgressPercentage()}%` }]} />
                            </View>
                            <Text style={styles.progressText}>{Math.round(getProgressPercentage())}% Complete</Text>
                        </View>

                        {/* Map Placeholder */}
                        <View style={styles.mapContainer}>
                            <View style={styles.mapPlaceholder}>
                                <Ionicons name="map" size={48} color="#ccc" />
                                <Text style={styles.mapPlaceholderText}>Guardian Tracking</Text>
                                <Text style={styles.mapPlaceholderSubtext}>
                                    Live location tracking active • Route to destination
                                </Text>
                                <View style={styles.locationInfo}>
                                    <Text style={styles.locationLabel}>Current Location:</Text>
                                    <Text style={styles.locationCoordinates}>
                                        {currentLocation ?
                                            `${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)}` :
                                            'Getting location...'
                                        }
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Trusted Contacts Status */}
                        <View style={styles.contactsStatus}>
                            <Text style={styles.contactsTitle}>Trusted Contacts Monitoring</Text>
                            {guardianSession.trustedContacts.map(contactId => {
                                const contact = trustedContacts.find(c => c.id === contactId);
                                return contact ? (
                                    <View key={contactId} style={styles.contactStatus}>
                                        <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                                        <Text style={styles.contactName}>{contact.name}</Text>
                                        <Text style={styles.contactStatusText}>Monitoring</Text>
                                    </View>
                                ) : null;
                            })}
                        </View>

                        {/* Next Check-in */}
                        {nextCheckIn && (
                            <View style={styles.checkInInfo}>
                                <Ionicons name="time" size={20} color="#FF9500" />
                                <Text style={styles.checkInText}>
                                    Next safety check-in in {Math.max(0, Math.floor((nextCheckIn.getTime() - Date.now()) / 60000))} minutes
                                </Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.inactiveContainer}>
                        <Ionicons name="shield-outline" size={64} color="#ccc" />
                        <Text style={styles.inactiveTitle}>Guardian Mode Inactive</Text>
                        <Text style={styles.inactiveSubtitle}>
                            Start a journey to activate live monitoring and safety features
                        </Text>

                        <TouchableOpacity
                            style={styles.startButton}
                            onPress={() => setShowStartModal(true)}
                        >
                            <Ionicons name="play" size={24} color="#fff" />
                            <Text style={styles.startButtonText}>Start Guardian Mode</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Settings Button */}
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => setShowSettingsModal(true)}
                >
                    <Ionicons name="settings" size={20} color="#666" />
                    <Text style={styles.settingsButtonText}>Guardian Settings</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Modals (Start, Settings, Check-in) remain unchanged */}
            {/* Replace `mockTrustedContacts` in Start Modal with `trustedContacts` */}
            {/* ... (Rest of JSX for Modals stays the same, just change data source) */}
        </SafeAreaView>
    );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  inactiveContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
  },
  inactiveTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  inactiveSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  activeSessionContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginLeft: 12,
  },
  sessionInfo: {
    marginBottom: 16,
  },
  destinationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e1e5e9',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  map: {
    flex: 1,
  },
  contactsStatus: {
    marginBottom: 16,
  },
  contactsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  contactStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginLeft: 8,
    flex: 1,
  },
  contactStatusText: {
    fontSize: 12,
    color: '#34C759',
  },
  checkInInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7e6',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  checkInText: {
    fontSize: 14,
    color: '#FF9500',
    marginLeft: 8,
    flex: 1,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalStartButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  inputSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#f8f9fa',
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  contactOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  contactOptionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  contactOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  contactOptionRelationship: {
    fontSize: 14,
    color: '#666',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  intervalInput: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    padding: 8,
    width: 60,
    textAlign: 'center',
    fontSize: 16,
    marginRight: 8,
  },
  intervalUnit: {
    fontSize: 16,
    color: '#666',
  },
  // Check-in Modal Styles
  checkInModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    margin: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  checkInModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  checkInModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  checkInButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    minWidth: 120,
  },
  yesButton: {
    backgroundColor: '#34C759',
  },
  noButton: {
    backgroundColor: '#FF3B30',
  },
  checkInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  mapPlaceholder: {
    alignItems: 'center',
    padding: 20,
  },
  mapPlaceholderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 4,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  locationInfo: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  locationLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  locationCoordinates: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
});

