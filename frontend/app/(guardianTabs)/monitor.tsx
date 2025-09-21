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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useAuth } from '../../contexts/AuthContext';
import GuardianService from '../../services/guardianService';
import NotificationService from '../../services/NotificationService';

interface GuardianSession {
  id: string;
  sessionId: string;
  destination: string;
  startTime: string;
  estimatedArrival: string;
  isActive: boolean;
  currentLocation: {
    latitude: number;
    longitude: number;
    lastUpdated: string;
  };
  studentId: {
    name: string;
    email: string;
    studentId: string;
  };
  status: 'active' | 'completed' | 'cancelled' | 'emergency';
  route: Array<{
    latitude: number;
    longitude: number;
    timestamp: string;
  }>;
}

export default function GuardianMonitorScreen() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<GuardianSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<GuardianSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef<MapView>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load guardian sessions on component mount
  useFocusEffect(
    useCallback(() => {
      loadGuardianSessions();
    }, [])
  );

  // Real-time location updates
  useEffect(() => {
    if (!selectedSession) return;

    const interval = setInterval(async () => {
      try {
        const updatedSession = await GuardianService.getSessionDetails(selectedSession.id);
        if (updatedSession) {
          setSelectedSession(updatedSession);
        }
      } catch (error) {
        console.error('Error updating location:', error);
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [selectedSession]);

  const loadGuardianSessions = async () => {
    try {
      setIsLoading(true);
      
      // Check for deep linking data first
      const deepLinkData = await NotificationService.getStoredSessionData();
      if (deepLinkData && deepLinkData.sessionId) {
        console.log('Deep link data found:', deepLinkData);
        // Try to find the specific session from deep link
        const response = await GuardianService.getMonitoredSessions(1, 50, 'active');
        const sessions = response.sessions || [];
        const targetSession = sessions.find(s => s.id === deepLinkData.sessionId);
        if (targetSession) {
          setSelectedSession(targetSession);
          setSessions(sessions);
          setIsLoading(false);
          return;
        }
      }
      
      // Get sessions monitored by this guardian
      const response = await GuardianService.getMonitoredSessions(1, 50, 'active');
      setSessions(response.sessions || []);
      
      // If there's only one session, select it automatically
      if (response.sessions && response.sessions.length === 1) {
        setSelectedSession(response.sessions[0]);
      }
    } catch (error) {
      console.error('Load guardian sessions error:', error);
      Alert.alert('Error', 'Failed to load guardian sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGuardianSessions();
    setRefreshing(false);
  };

  const handleSessionSelect = (session: GuardianSession) => {
    setSelectedSession(session);
  };

  const handleFindStudent = async () => {
    if (!selectedSession) {
      Alert.alert('No Session', 'Please select a session first');
      return;
    }

    try {
      // Get the latest location for the selected session
      const updatedSession = await GuardianService.getSessionDetails(selectedSession.id);
      if (updatedSession) {
        setSelectedSession(updatedSession);
        Alert.alert(
          'Location Updated',
          `Student's location has been refreshed. Last updated: ${new Date(updatedSession.currentLocation.lastUpdated).toLocaleTimeString()}`
        );
      }
    } catch (error) {
      console.error('Error finding student:', error);
      Alert.alert('Error', 'Failed to get latest student location');
    }
  };

  const handleCenterOnStudent = (session: GuardianSession) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: session.currentLocation.latitude,
        longitude: session.currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#34C759';
      case 'emergency':
        return '#FF3B30';
      case 'completed':
        return '#007AFF';
      case 'cancelled':
        return '#8E8E93';
      default:
        return '#8E8E93';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return 'shield-checkmark';
      case 'emergency':
        return 'warning';
      case 'completed':
        return 'checkmark-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString();
  };

  const getTimeRemaining = (estimatedArrival: string) => {
    const now = new Date();
    const arrival = new Date(estimatedArrival);
    const diff = arrival.getTime() - now.getTime();
    
    if (diff <= 0) return 'Overdue';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading guardian sessions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Guardian Monitor</Text>
          <Text style={styles.subtitle}>Monitor your students' safety</Text>
        </View>

        {/* Sessions List */}
        <View style={styles.sessionsContainer}>
          <Text style={styles.sectionTitle}>Active Sessions</Text>
          {sessions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Active Sessions</Text>
              <Text style={styles.emptySubtitle}>
                No students are currently using Guardian mode
              </Text>
            </View>
          ) : (
            sessions.map((session: GuardianSession) => (
              <TouchableOpacity
                key={session.id}
                style={[
                  styles.sessionCard,
                  selectedSession?.id === session.id && styles.selectedSessionCard
                ]}
                onPress={() => handleSessionSelect(session)}
              >
                <View style={styles.sessionHeader}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{session.studentId.name}</Text>
                    <Text style={styles.studentId}>{session.studentId.studentId}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(session.status) }]}>
                    <Ionicons 
                      name={getStatusIcon(session.status) as any} 
                      size={16} 
                      color="#fff" 
                    />
                    <Text style={styles.statusText}>{session.status.toUpperCase()}</Text>
                  </View>
                </View>
                
                <View style={styles.sessionDetails}>
                  <Text style={styles.destination}>To: {session.destination}</Text>
                  <Text style={styles.timeInfo}>
                    Started: {formatTime(session.startTime)}
                  </Text>
                  <Text style={styles.timeInfo}>
                    ETA: {getTimeRemaining(session.estimatedArrival)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Map View */}
        {selectedSession && (
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>
                {selectedSession.studentId.name}'s Location
              </Text>
              <TouchableOpacity 
                style={styles.findStudentButton}
                onPress={handleFindStudent}
              >
                <Ionicons name="locate" size={20} color="#007AFF" />
                <Text style={styles.findStudentText}>Find Student</Text>
              </TouchableOpacity>
            </View>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: selectedSession.currentLocation.latitude,
                longitude: selectedSession.currentLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              showsUserLocation={false}
              ref={mapRef}
            >
              {/* Student's current location */}
              <Marker
                coordinate={{
                  latitude: selectedSession.currentLocation.latitude,
                  longitude: selectedSession.currentLocation.longitude,
                }}
                title={selectedSession.studentId.name}
                description={`Last updated: ${formatTime(selectedSession.currentLocation.lastUpdated)}`}
                pinColor={getStatusColor(selectedSession.status)}
              />

              {/* Route polyline */}
              {selectedSession.route && selectedSession.route.length > 1 && (
                <Polyline
                  coordinates={selectedSession.route.map((point: any) => ({
                    latitude: point.latitude,
                    longitude: point.longitude,
                  }))}
                  strokeColor="#007AFF"
                  strokeWidth={3}
                />
              )}
            </MapView>
            
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Current Location:</Text>
              <Text style={styles.locationCoordinates}>
                {selectedSession.currentLocation.latitude.toFixed(6)}, {selectedSession.currentLocation.longitude.toFixed(6)}
              </Text>
              <Text style={styles.lastUpdated}>
                Last updated: {formatTime(selectedSession.currentLocation.lastUpdated)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
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
  sessionsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedSessionCard: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sessionDetails: {
    gap: 4,
  },
  destination: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  timeInfo: {
    fontSize: 14,
    color: '#666',
  },
  mapContainer: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  map: {
    height: 300,
  },
  locationInfo: {
    padding: 16,
    backgroundColor: '#f8f9fa',
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
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666',
  },
});
