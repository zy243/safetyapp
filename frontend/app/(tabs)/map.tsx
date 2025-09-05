import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    SafeAreaView,
    Dimensions,
    Modal,
} from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://192.168.0.100:5000";
import { Ionicons } from '@expo/vector-icons';
import GoogleMapsView from '../../components/GoogleMapsView';
import HelpButton from '../../components/HelpButton';
import * as Location from 'expo-location';
import { MAPS_CONFIG } from '../../config/maps';
import GeofencingService, { University } from '../../services/GeofencingService';
import { speakPageTitle, speakButtonAction } from '../../services/SpeechService';
import { openGoogleMaps } from '../../services/NavigationService';
import axios from 'axios';
import * as Sharing from 'expo-sharing';

const { width, height } = Dimensions.get('window');

interface Incident {
    id: number;
    type: string;
    title: string;
    description: string;
    location: { latitude: number; longitude: number };
    time: string;
    severity: string;
}

// Mock crowd density & route data
const mockCrowdDensity = [
    { id: 1, location: { latitude: 37.78825, longitude: -122.4324 }, density: 'high', count: 45 },
    { id: 2, location: { latitude: 37.78925, longitude: -122.4344 }, density: 'medium', count: 23 },
    { id: 3, location: { latitude: 37.78725, longitude: -122.4304 }, density: 'low', count: 8 },
];
const mockSafeRoute = [
    { latitude: 3.1150, longitude: 101.6480 },
    { latitude: 3.1201, longitude: 101.6544 },
    { latitude: 3.1250, longitude: 101.6600 },
];

const incidentIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    theft: 'briefcase-outline',
    harassment: 'warning-outline',
    accident: 'car-outline',
    suspicious: 'eye-outline',
    fire: 'flame-outline',
};

const incidentColors = {
    theft: '#FF9500',
    harassment: '#FF3B30',
    accident: '#007AFF',
    suspicious: '#FF6B35',
    fire: '#FF2D55',
};

const densityColors = {
    high: '#FF3B30',
    medium: '#FF9500',
    low: '#34C759',
};

export default function MapScreen() {
    const [selectedIncidentType, setSelectedIncidentType] = useState('all');
    const [showSafeRoute, setShowSafeRoute] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
    const [currentUniversity, setCurrentUniversity] = useState<University | null>(null);
    const [region, setRegion] = useState(MAPS_CONFIG.DEFAULT_REGION);
    const [isFullScreenMap, setIsFullScreenMap] = useState(false);

    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [crowdDensity, setCrowdDensity] = useState(mockCrowdDensity);
    const [safeRoute, setSafeRoute] = useState(mockSafeRoute);

    // Accessibility: speak page title
    useFocusEffect(
        useCallback(() => {
            speakPageTitle('Campus Map');
        }, [])
    );

    // Request location permissions
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    speakButtonAction('Location permission denied.');
                    Alert.alert('Permission denied', 'Location permission is required.');
                    return;
                }
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 5000,
                });
                setUserLocation(location);
                setRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
            } catch (error) {
                console.error(error);
                speakButtonAction('Unable to get your current location.');
                Alert.alert('Location Error', 'Unable to get your current location.');
            }
        })();
    }, []);

    // Fetch incidents from backend
    useEffect(() => {
        const fetchIncidents = async () => {
            try {
                const response = await axios.get('https://your-backend.com/api/incidents');
                if (response.data) setIncidents(response.data);
            } catch (error) {
                console.error('Error fetching incidents:', error);
                setIncidents([]);
            }
        };
        fetchIncidents();
    }, []);

    const filteredIncidents =
        selectedIncidentType === 'all'
            ? incidents
            : incidents.filter(i => i.type === selectedIncidentType);

    const getIncidentIcon = (type: string): keyof typeof Ionicons.glyphMap =>
        incidentIcons[type] || 'alert-circle-outline';
    const getIncidentColor = (type: string) => incidentColors[type] || '#FF3B30';
    const getDensityColor = (density: string) => densityColors[density] || '#34C759';

    // Safe route calculation
    const calculateSafeRoute = async () => {
        try {
            const response = await axios.post('https://your-backend.com/api/safe-route', {
                from: userLocation?.coords,
                to: safeRoute[safeRoute.length - 1],
            });
            if (response.data?.route) setSafeRoute(response.data.route);
        } catch (error) {
            console.error('Error calculating safe route:', error);
            setSafeRoute(mockSafeRoute);
        }
    };

    const handleSafeRouteToggle = async () => {
        if (!showSafeRoute) await calculateSafeRoute();
        setShowSafeRoute(!showSafeRoute);
        Alert.alert('Safe Routes', showSafeRoute ? 'Safe route hidden' : 'Safe route displayed.');
    };

    const handleNavigateToDestination = () => {
        if (showSafeRoute) {
            Alert.alert('Navigation', 'Starting navigation to destination using safe route.');
        } else {
            Alert.alert('Navigation', 'Please enable safe routes first.');
        }
    };

    const centerOnUserLocation = () => {
        if (userLocation) {
            setRegion({
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
    };

    // Share & report actions
    const handleShareIncident = async (incident: Incident) => {
        try {
            const message = `Incident: ${incident.title}\nDescription: ${incident.description}\nLocation: https://maps.google.com/?q=${incident.location.latitude},${incident.location.longitude}`;
            await Sharing.shareAsync('', { message });
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Unable to share incident.');
        }
    };

    const handleReportIncident = async (incident: Incident) => {
        try {
            await axios.post('https://your-backend.com/api/report', { incidentId: incident.id });
            Alert.alert('Reported', 'Incident reported successfully.');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Unable to report incident.');
        }
    };

    const getRouteSafetyScore = () => {
        const incidentsOnRoute = filteredIncidents.filter(i => i.type !== 'safe');
        const score = Math.max(0, 100 - incidentsOnRoute.length * 20);
        return Math.min(100, score);
    };

    return (
        <SafeAreaView style={styles.container}>
            <HelpButton userLocation={userLocation} currentUniversity={currentUniversity} />

            {/* Filter Bar */}
            <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                        style={[styles.filterChip, selectedIncidentType === 'all' && styles.filterChipActive]}
                        onPress={() => setSelectedIncidentType('all')}
                    >
                        <Text style={[styles.filterText, selectedIncidentType === 'all' && styles.filterTextActive]}>All</Text>
                    </TouchableOpacity>
                    {Object.keys(incidentIcons).map(type => (
                        <TouchableOpacity
                            key={type}
                            style={[styles.filterChip, selectedIncidentType === type && styles.filterChipActive]}
                            onPress={() => setSelectedIncidentType(type)}
                        >
                            <Ionicons name={getIncidentIcon(type)} size={16} color={selectedIncidentType === type ? '#fff' : getIncidentColor(type)} />
                            <Text style={[styles.filterText, selectedIncidentType === type && styles.filterTextActive]}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Map */}
            <View style={styles.mapContainer}>
                {userLocation ? (
                    <GoogleMapsView
                        userLocation={{ latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude }}
                        incidents={filteredIncidents}
                        showSafeRoute={showSafeRoute}
                        safeRoute={safeRoute}
                        crowdDensity={crowdDensity}
                        currentUniversity={currentUniversity}
                        onMapPress={(lat, lng) => console.log('Map clicked at:', { lat, lng })}
                    />
                ) : (
                    <View style={styles.mapPlaceholder}>
                        <Ionicons name="map" size={64} color="#007AFF" />
                        <Text style={styles.mapPlaceholderText}>Loading Google Maps...</Text>
                        <Text style={styles.mapPlaceholderSubtext}>Requesting location permissions...</Text>
                    </View>
                )}
            </View>

            {/* Control Buttons */}
            <View style={styles.controlButtons}>
                <TouchableOpacity style={styles.controlButton} onPress={handleNavigateToDestination}>
                    <Ionicons name="navigate" size={24} color="#007AFF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.controlButton} onPress={() => setIsFullScreenMap(true)}>
                    <Ionicons name="expand" size={24} color="#007AFF" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.controlButton, showSafeRoute && styles.controlButtonActive]} onPress={handleSafeRouteToggle}>
                    <Ionicons name="map" size={24} color={showSafeRoute ? '#fff' : '#007AFF'} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.controlButton} onPress={centerOnUserLocation}>
                    <Ionicons name="locate" size={24} color="#007AFF" />
                </TouchableOpacity>

                {showSafeRoute && (
                    <View style={styles.safetyScoreContainer}>
                        <Text style={styles.safetyScoreLabel}>Route Safety</Text>
                        <View style={styles.safetyScoreBar}>
                            <View style={[styles.safetyScoreFill, { width: `${getRouteSafetyScore()}%` }]} />
                        </View>
                        <Text style={styles.safetyScoreText}>{getRouteSafetyScore()}%</Text>
                    </View>
                )}
            </View>

            {/* Incident Modal */}
            <Modal visible={!!selectedIncident} transparent animationType="slide" onRequestClose={() => setSelectedIncident(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{selectedIncident?.title}</Text>
                            <TouchableOpacity onPress={() => setSelectedIncident(null)}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalBody}>
                            <View style={styles.incidentInfo}>
                                <Ionicons name={getIncidentIcon(selectedIncident?.type || '')} size={24} color={getIncidentColor(selectedIncident?.type || '')} />
                                <Text style={styles.incidentType}>{selectedIncident?.type?.charAt(0).toUpperCase() + selectedIncident.type.slice(1)}</Text>
                            </View>
                            <Text style={styles.incidentDescription}>{selectedIncident?.description}</Text>
                            <Text style={styles.incidentTime}>Reported: {selectedIncident?.time}</Text>
                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.actionButton} onPress={handleNavigateToDestination}>
                                    <Ionicons name="navigate" size={20} color="#007AFF" />
                                    <Text style={styles.actionButtonText}>Navigate</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionButton} onPress={() => selectedIncident && handleShareIncident(selectedIncident)}>
                                    <Ionicons name="share" size={20} color="#34C759" />
                                    <Text style={styles.actionButtonText}>Share</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionButton} onPress={() => selectedIncident && handleReportIncident(selectedIncident)}>
                                    <Ionicons name="flag" size={20} color="#FF9500" />
                                    <Text style={styles.actionButtonText}>Report</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Fullscreen Map */}
            <Modal visible={isFullScreenMap} transparent={false} animationType="fade" onRequestClose={() => setIsFullScreenMap(false)}>
                <View style={styles.fullScreenContainer}>
                    <View style={styles.fullScreenTopBar}>
                        <TouchableOpacity style={styles.fullScreenCloseButton} onPress={() => setIsFullScreenMap(false)}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    {userLocation && (
                        <GoogleMapsView
                            userLocation={{ latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude }}
                            incidents={filteredIncidents}
                            showSafeRoute={showSafeRoute}
                            safeRoute={safeRoute}
                            crowdDensity={crowdDensity}
                            currentUniversity={currentUniversity}
                            fullScreen
                        />
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// Your styles remain unchanged
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    filterContainer: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e1e5e9' },
    filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 12, borderWidth: 1, borderColor: '#e1e5e9' },
    filterChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    filterText: { fontSize: 14, fontWeight: '500', color: '#666', marginLeft: 6 },
    filterTextActive: { color: '#fff' },
    mapContainer: { flex: 1, margin: 16, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
    map: { flex: 1, borderRadius: 16 },
    controlButtons: { position: 'absolute', right: 20, bottom: 100, gap: 12 },
    controlButton: { width: 50, height: 50, backgroundColor: '#fff', borderRadius: 25, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    controlButtonActive: { backgroundColor: '#34C759' },
    safetyScoreContainer: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginTop: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    safetyScoreLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
    safetyScoreBar: { width: '100%', height: 8, backgroundColor: '#e1e5e9', borderRadius: 4, marginBottom: 8, overflow: 'hidden' },
    safetyScoreFill: { height: '100%', backgroundColor: '#34C759', borderRadius: 4 },
    safetyScoreText: { fontSize: 16, fontWeight: 'bold', color: '#34C759' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: height * 0.6 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
    modalBody: { gap: 16 },
    incidentInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    incidentType: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
    incidentDescription: { fontSize: 16, color: '#666', lineHeight: 24 },
    incidentTime: { fontSize: 14, color: '#999' },
    modalActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
    actionButton: { alignItems: 'center', gap: 8 },
    actionButtonText: { fontSize: 14, fontWeight: '500', color: '#666' },
    mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mapPlaceholderText: { fontSize: 18, fontWeight: '600', color: '#007AFF', marginTop: 12 },
    mapPlaceholderSubtext: { fontSize: 14, color: '#666', marginTop: 4 },
    fullScreenContainer: { flex: 1, backgroundColor: '#000' },
    fullScreenTopBar: { position: 'absolute', top: 40, right: 20, zIndex: 999 },
    fullScreenCloseButton: { padding: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 24 },
});
