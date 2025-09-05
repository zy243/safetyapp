import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Camera } from "expo-camera";
import { CameraView, CameraType, FlashMode } from "expo-camera";
import * as MediaLibrary from 'expo-media-library';
import * as Torch from 'expo-torch';

import {
    speak,
    speakButtonAction,
    speakNotification,
    speakEmergencyAlert,
    speakSOSCountdown,
    speakPageTitle
} from '../../services/SpeechService';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://192.168.0.100:5000";
const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
    const [sosPressCount, setSosPressCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [showSOSModal, setShowSOSModal] = useState(false);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [showNotificationsModal, setShowNotificationsModal] = useState(false);
    const [unreadCount, setUnreadCount] = useState(3);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [isSOSActivated, setIsSOSActivated] = useState(false);
    const [capturedMedia, setCapturedMedia] = useState<{ photo?: string; video?: string }>({});
    const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
    const [sosStartTime, setSosStartTime] = useState<Date | null>(null);
    const [locationAddress, setLocationAddress] = useState<string>('Getting address...');
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [hasMicrophonePermission, setHasMicrophonePermission] = useState<boolean | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const cameraRef = useRef<CameraView | null>(null);
    const [cameraType, setCameraType] = useState<CameraType>('back');
    const [cameraFlash, setCameraFlash] = useState<FlashMode>('off');
    const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(false);
    const [autoCaptureSOS, setAutoCaptureSOS] = useState(false);

    const sosTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const recordingRef = useRef<{ isRecording: boolean }>({ isRecording: false });
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [safetyAlerts, setSafetyAlerts] = useState([
        {
            id: 1,
            type: 'warning',
            message: '⚠️ Reported incident near Faculty of Engineering 5 mins ago',
            time: '5 mins ago',
        },
        {
            id: 2,
            type: 'info',
            message: 'ℹ️ Campus security patrol in Science Building area',
            time: '15 mins ago',
        },
    ]);

    const [recentActivities] = useState([
        { id: 1, type: 'guardian', count: 3, label: 'Guardian Sessions' },
        { id: 2, type: 'location', count: 12, label: 'Location Shares' },
        { id: 3, type: 'reports', count: 2, label: 'Reports Filed' },
        { id: 4, type: 'checkin', count: 8, label: 'Safety Check-ins' },
    ]);

    const notifications = [
        { id: 'n1', title: 'Trusted Friend Request accepted', description: 'Emma accepted your request.', time: '2:45 PM', read: false },
        { id: 'n2', title: 'Guardian session ended', description: 'Your route to Library completed.', time: '1:10 PM', read: true },
        { id: 'n3', title: 'Safety Alert', description: 'Patrol near Science Building.', time: '12:30 PM', read: false },
    ];

    useEffect(() => {
        if (sosPressCount > 0) {
            const timer = setTimeout(() => {
                setSosPressCount(0);
                setCountdown(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [sosPressCount]);

    useEffect(() => {
        (async () => {
            const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();

            if (locationStatus === 'granted') {
                const location = await Location.getCurrentPositionAsync({});
                setCurrentLocation(location);
                reverseGeocode(location.coords.latitude, location.coords.longitude);
            }

            const { status: camStatus } = await Camera.requestCameraPermissionsAsync();
            const { status: micStatus } = await Camera.requestMicrophonePermissionsAsync();

            setHasCameraPermission(camStatus === "granted");
            setHasMicrophonePermission(micStatus === "granted");

            console.log("Camera:", camStatus, "Mic:", micStatus);

            const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
            setHasMediaLibraryPermission(mediaStatus === 'granted');
        })();
    }, []);

    useEffect(() => {
        speakPageTitle('Home');
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();

                if (locationStatus === 'granted') {
                    const location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.High
                    });
                    setCurrentLocation(location);
                    await reverseGeocode(location.coords.latitude, location.coords.longitude);
                } else {
                    setLocationAddress('Location permission denied');
                }
            } catch (error) {
                console.error('Error getting location:', error);
                setLocationAddress('Error getting location');
            }
        })();
    }, []);

    useEffect(() => {
        return () => {
            if (sosTimeoutRef.current) {
                clearTimeout(sosTimeoutRef.current);
            }
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        (async () => {
            const saved = await AsyncStorage.getItem('@autoCaptureSOS');
            if (saved !== null) setAutoCaptureSOS(saved === 'true');
        })();
    }, []);

    const reverseGeocode = async (latitude: number, longitude: number) => {
        try {
            setLocationAddress('Getting address...');

            const reverseGeocodedAddress = await Location.reverseGeocodeAsync({
                latitude,
                longitude,
            });

            if (reverseGeocodedAddress.length > 0) {
                const address = reverseGeocodedAddress[0];
                const addressParts = [
                    address.name,
                    address.street,
                    address.city,
                    address.region,
                    address.postalCode,
                    address.country
                ].filter(part => part && part.trim() !== '');

                setLocationAddress(addressParts.join(', ') || 'Address not available');
            } else {
                setLocationAddress('Address not available');
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            setLocationAddress('Error getting address');
        }
    };

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({});
                setCurrentLocation(location);
                await reverseGeocode(location.coords.latitude, location.coords.longitude);
            }
        } catch (error) {
            console.error('Error requesting location permission:', error);
        }
    };

    const handleSOSPressIn = () => {
        setCountdown(3);

        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }

        if (sosTimeoutRef.current) {
            clearTimeout(sosTimeoutRef.current);
            sosTimeoutRef.current = null;
        }

        countdownIntervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev && prev > 1) {
                    return prev - 1;
                } else {
                    if (countdownIntervalRef.current) {
                        clearInterval(countdownIntervalRef.current);
                        countdownIntervalRef.current = null;
                    }
                    return null;
                }
            });
        }, 1000);

        sosTimeoutRef.current = setTimeout(() => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }
            setCountdown(null);
            activateSOS();
        }, 3000);
    };

    const activateSOS = async () => {
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setIsSOSActivated(true);
            setSosStartTime(new Date());
            await triggerSOSActions();
        } catch (err) {
            console.error("SOS activation error:", err);
        }
    };

    const triggerSOSActions = async () => {
        try {
            await silentEmergencyActions();
            setShowSOSModal(true);
            console.log("🚨 SOS fully activated!");
        } catch (error) {
            console.error("Error in triggerSOSActions:", error);
        }
    };

    const captureEmergencyMedia = async () => {
        if (!hasCameraPermission || !autoCaptureSOS) {
            console.log('No camera permission or auto-capture disabled, skipping media capture');
            return;
        }

        try {
            await takePicture();
            await new Promise(resolve => setTimeout(resolve, 500));

            if (cameraRef.current && cameraReady) {
                setIsRecording(true);
                recordingRef.current.isRecording = true;
                await new Promise(resolve => setTimeout(resolve, 1000));

                const video = await cameraRef.current.recordAsync({
                    maxDuration: 10,
                    maxFileSize: 10_000_000,
                });

                if (video?.uri) {
                    if (hasMediaLibraryPermission) {
                        try {
                            const asset = await MediaLibrary.createAssetAsync(video.uri);
                            await MediaLibrary.createAlbumAsync("SafetySOS", asset, false);
                        } catch (mediaError) {
                            console.log("Error saving video to media library:", mediaError);
                        }
                    }
                    setCapturedMedia(prev => ({ ...prev, video: video.uri }));
                }
            }
        } catch (error) {
            console.log('Error in captureEmergencyMedia:', error);
        } finally {
            setIsRecording(false);
            recordingRef.current.isRecording = false;
        }
    };

    const toggleRecording = async () => {
        if (!hasCameraPermission || !hasMicrophonePermission) {
            Alert.alert("Error", "Camera or microphone permission not granted");
            return;
        }

        if (cameraRef.current && cameraReady) {
            try {
                if (isRecording) {
                    await cameraRef.current.stopRecording();
                    setIsRecording(false);
                    speak("Video recording stopped");
                } else {
                    setIsRecording(true);
                    speak("Video recording started");
                    await new Promise(resolve => setTimeout(resolve, 300));

                    const video = await cameraRef.current.recordAsync({
                        maxDuration: 60,
                        maxFileSize: 50_000_000,
                    });

                    if (video?.uri) {
                        if (hasMediaLibraryPermission) {
                            try {
                                const asset = await MediaLibrary.createAssetAsync(video.uri);
                                await MediaLibrary.createAlbumAsync("SafetySOS", asset, false);
                                setCapturedMedia(prev => ({ ...prev, video: video.uri }));
                            } catch (mediaError) {
                                console.log("Error saving video:", mediaError);
                            }
                        }
                    }
                }
            } catch (error) {
                console.log("Error with video recording:", error);
                speak("Failed to control video recording");
                setIsRecording(false);
            }
        }
    };

    const takePicture = async () => {
        if (!hasCameraPermission) {
            Alert.alert('Error', 'Camera permission not granted');
            return;
        }

        if (cameraRef.current && cameraReady) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    skipProcessing: false,
                    exif: true
                });

                if (hasMediaLibraryPermission) {
                    try {
                        const asset = await MediaLibrary.createAssetAsync(photo.uri);
                        await MediaLibrary.createAlbumAsync('SafetySOS', asset, false);
                    } catch (mediaError) {
                        console.log('Error saving photo:', mediaError);
                    }
                }

                setCapturedMedia(prev => ({ ...prev, photo: photo.uri }));
                console.log('Photo captured successfully:', photo.uri);
            } catch (error) {
                console.log('Error taking picture:', error);
            }
        }
    };

    const handleSOSPressOut = () => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }

        if (sosTimeoutRef.current) {
            clearTimeout(sosTimeoutRef.current);
            sosTimeoutRef.current = null;
        }

        setCountdown(null);
    };

    const silentEmergencyActions = async () => {
        try {
            if (autoCaptureSOS) {
                try {
                    const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
                    if (locationStatus === 'granted') {
                        const location = await Location.getCurrentPositionAsync({});
                        setCurrentLocation(location);
                        await reverseGeocode(location.coords.latitude, location.coords.longitude);
                    } else {
                        setLocationAddress('Location permission needed for SOS');
                    }
                } catch (locationError) {
                    console.error('Location error in SOS:', locationError);
                    setLocationAddress('Location unavailable');
                }
                await captureEmergencyMedia();
                await sendSilentEmergencyData();

                console.log('🚨 SILENT EMERGENCY ACTIONS COMPLETED:');
                console.log('- Location obtained:', currentLocation ? 'Yes' : 'No');
            } else {
                console.log('🚨 Auto-capture disabled, skipping media capture');
                await sendSilentEmergencyData();
            }
        } catch (error) {
            console.log('Silent emergency actions failed:', error);
        }
    };

    const sendSilentEmergencyData = async () => {
        console.log('📱 SILENTLY sending emergency data to all contacts...');

        const emergencyContacts = ['Mom', 'Dad', 'Campus Security'];
        emergencyContacts.forEach(contact => {
            console.log(`📤 Data sent to ${contact}:`);
            console.log(`   📍 Location: ${currentLocation ? 'Captured' : 'Getting...'}`);
            console.log(`   📸 Photo: ${capturedMedia.photo ? 'Captured' : 'Failed'}`);
            console.log(`   🎥 Video: ${capturedMedia.video ? 'Recording' : 'Failed'}`);
            console.log(`   ⏰ Time: ${new Date().toLocaleTimeString()}`);
        });
    };

    const handleFollowMe = () => {
        const newState = !isFollowing;
        setIsFollowing(newState);
        speakButtonAction(newState ? 'Follow Me activated' : 'Follow Me deactivated');

        if (newState) {
            router.push({
                pathname: '/map',
                params: {
                    followMode: 'true',
                    latitude: currentLocation?.coords.latitude,
                    longitude: currentLocation?.coords.longitude
                }
            });
        }

        Alert.alert(
            newState ? 'Follow Me Activated' : 'Follow Me Deactivated',
            newState
                ? 'Your location is now being shared with trusted contacts. Opening map...'
                : 'Your location is no longer being shared with trusted contacts.',
            [{ text: 'OK' }]
        );
    };

    const toggleTorch = async () => {
        try {
            const { status } = await Torch.requestPermissionsAsync();
            if (status === 'granted') {
                const isTorchActive = await Torch.getStateAsync();
                if (isTorchActive.isTorchOn) {
                    await Torch.turnOffAsync();
                    setIsTorchOn(false);
                    speak("Flashlight turned off");
                } else {
                    await Torch.turnOnAsync();
                    setIsTorchOn(true);
                    speak("Flashlight turned on");
                }
            } else {
                Alert.alert('Permission needed', 'Camera permission is required to use flashlight');
            }
        } catch (error) {
            console.error('Error toggling torch:', error);
            Alert.alert('Error', 'Could not access flashlight');
        }
    };

    const handleViewAllAlerts = () => {
        router.push('/alerts');
        speakButtonAction('Viewing all safety alerts');
    };

    const handleEmergencyCall = (type: string) => {
        let phoneNumber = '';
        let title = '';

        switch (type) {
            case 'campus':
                phoneNumber = '+1 (555) 911-0000';
                title = 'Campus Security';
                break;
            case 'police':
                phoneNumber = '999';
                title = 'Police (999)';
                break;
            case 'hospital':
                phoneNumber = '+1 (555) 911-0002';
                title = 'Hospital';
                break;
            case 'trusted':
                speakButtonAction('Notifying trusted contacts with live location');
                Alert.alert('Trusted Contact', 'Notifying your trusted contacts with live location');
                return;
        }

        Alert.alert(
            `Call ${title}`,
            `Do you want to call ${title}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Call',
                    onPress: () => {
                        Linking.openURL(`tel:${phoneNumber}`);
                    },
                },
            ]
        );
    };

    const handleCancelSOS = () => {
        if (recordingRef.current.isRecording && cameraRef.current) {
            cameraRef.current.stopRecording();
            setIsRecording(false);
            recordingRef.current.isRecording = false;
        }

        setShowSOSModal(false);
        setIsSOSActivated(false);
        setSosStartTime(null);
        setCapturedMedia({});
        Alert.alert('SOS Cancelled', 'Emergency has been cancelled. Stay safe!');
    };

    const toggleCameraType = () => {
        setCameraType(prev => (prev === 'back' ? 'front' : 'back'));
    };

    const toggleFlash = () => {
        setCameraFlash(prev => (prev === 'off' ? 'on' : 'off'));
    };

    return (
        <SafeAreaView style={styles.container}>
            <CameraView
                ref={cameraRef}
                style={{ width: 1, height: 1, position: "absolute", top: -1000 }}
                facing={cameraType}
                flash={(isTorchOn ? "torch" : "off") as FlashMode}
                ratio="16:9"
                onCameraReady={() => setCameraReady(true)}
            />
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header with Notifications Bell */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.greeting}>Welcome back! 👋</Text>
                        <Text style={styles.subtitle}>Stay safe on campus</Text>
                    </View>

                    {/* Notifications Bell Button */}
                    <TouchableOpacity
                        style={styles.activityRingButton}
                        onPress={() => {
                            setShowNotificationsModal(true);
                            setUnreadCount(0);
                            speakButtonAction('Opening notifications');
                        }}
                        accessibilityLabel="Notifications"
                        accessibilityHint="View your notifications"
                    >
                        <View style={styles.bellContainer}>
                            <Ionicons name="notifications-outline" size={28} color="#007AFF" />
                            {unreadCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{unreadCount}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Safety Alerts Banner */}
                <View style={styles.alertsContainer}>
                    <View style={styles.alertsHeader}>
                        <Text style={styles.alertsTitle}>Safety Alerts</Text>
                        <TouchableOpacity onPress={handleViewAllAlerts}>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    {safetyAlerts.slice(0, 2).map((alert) => (
                        <View key={alert.id} style={styles.alertItem}>
                            <Ionicons
                                name={alert.type === 'warning' ? 'warning' : 'information-circle'}
                                size={20}
                                color={alert.type === 'warning' ? '#ff6b35' : '#007AFF'}
                            />
                            <Text style={styles.alertMessage}>{alert.message}</Text>
                            <Text style={styles.alertTime}>{alert.time}</Text>
                        </View>
                    ))}
                </View>

                {/* SOS Button as Large Circle with Secondary Buttons Below */}
                <View style={styles.sosMainContainer}>
                    {/* SOS Button */}
                    <TouchableOpacity
                        style={[styles.sosCircleButton, countdown !== null && styles.sosCircleButtonActive]}
                        onPressIn={handleSOSPressIn}
                        onPressOut={handleSOSPressOut}
                        activeOpacity={0.8}
                        accessibilityLabel="SOS Emergency Button"
                        accessibilityHint="Press and hold for 3 seconds to activate emergency SOS"
                    >
                        <View style={styles.sosCircleButtonContent}>
                            <Ionicons name="alert-circle" size={40} color="#fff" />
                            <Text style={styles.sosCircleButtonText}>
                                {countdown !== null ? countdown : 'SOS'}
                            </Text>
                            <Text style={styles.sosCircleButtonSubtext}>
                                {countdown !== null ? 'Hold...' : 'Hold 3s'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Secondary Buttons Below SOS */}
                    <View style={styles.secondaryButtonsContainer}>
                        {/* Follow Me Button */}
                        <TouchableOpacity
                            style={[styles.secondaryButton, styles.followMeButton, isFollowing && styles.followMeButtonActive]}
                            onPress={handleFollowMe}
                            accessibilityLabel="Follow Me Button"
                            accessibilityHint="Share your location with trusted contacts"
                        >
                            <View style={styles.secondaryButtonContent}>
                                <Ionicons
                                    name={isFollowing ? 'location' : 'location-outline'}
                                    size={24}
                                    color={isFollowing ? '#fff' : '#007AFF'}
                                />
                                <Text style={isFollowing ? styles.secondaryButtonText : styles.followMeText}>
                                    {isFollowing ? 'Following' : 'Follow Me'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Torchlight Button */}
                        <TouchableOpacity
                            style={[styles.secondaryButton, styles.torchButton, isTorchOn && styles.torchButtonActive]}
                            onPress={toggleTorch}
                            accessibilityLabel="Torchlight Button"
                            accessibilityHint="Turn on or off your device flashlight"
                        >
                            <View style={styles.secondaryButtonContent}>
                                <Ionicons
                                    name={isTorchOn ? "flashlight" : "flashlight-outline"}
                                    size={24}
                                    color={isTorchOn ? "#fff" : "#FFD700"}
                                />
                                <Text style={isTorchOn ? styles.secondaryButtonText : styles.torchButtonText}>
                                    {isTorchOn ? "ON" : "Torch"}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* SOS Countdown overlay */}
            {countdown !== null && (
                <View style={styles.countdownOverlay}>
                    <Text style={styles.countdownText}>{countdown}</Text>
                </View>
            )}

            {/* Hidden Camera for emergency capture */}
            <View style={styles.hiddenCameraContainer}></View>

            {/* SOS Modal - Shows AFTER silent actions are complete */}
            <Modal
                visible={showSOSModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowSOSModal(false)}
            >
                <View style={styles.sosModalOverlay}>
                    <View style={styles.sosModalContent}>
                        {/* Make the content scrollable */}
                        <ScrollView
                            style={styles.scrollableModalContent}
                            showsVerticalScrollIndicator={true}
                        >
                            {/* Header */}
                            <View style={styles.sosModalHeader}>
                                <Ionicons name="alert-circle" size={40} color="#FF3B30" />
                                <Text style={styles.sosModalTitle}>🚨 SOS ACTIVATED</Text>
                                <Text style={styles.sosModalSubtitle}>Emergency data sent to contacts</Text>
                                <Text style={styles.sosModalTime}>
                                    Activated at: {sosStartTime?.toLocaleTimeString()}
                                </Text>
                            </View>

                            {/* Status of Silent Actions - Icons only */}
                            <View style={styles.silentActionsStatus}>
                                <Text style={styles.silentActionsTitle}>✅ Actions Completed:</Text>
                                <View style={styles.statusIconsContainer}>
                                    <View style={styles.statusIcon}>
                                        <Ionicons
                                            name="camera"
                                            size={24}
                                            color={autoCaptureSOS && capturedMedia.photo ? "#34C759" : "#FF3B30"}
                                        />
                                        <Text style={styles.statusIconText}>
                                            {autoCaptureSOS ? (capturedMedia.photo ? "Photo" : "No Photo") : "Auto-capture Off"}
                                        </Text>
                                    </View>
                                    <View style={styles.statusIcon}>
                                        <Ionicons
                                            name="videocam"
                                            size={24}
                                            color={autoCaptureSOS && capturedMedia.video ? "#34C759" : "#FF3B30"}
                                        />
                                        <Text style={styles.statusIconText}>
                                            {autoCaptureSOS ? (capturedMedia.video ? "Video" : "No Video") : "Auto-capture Off"}
                                        </Text>
                                    </View>
                                    <View style={styles.statusIcon}>
                                        <Ionicons
                                            name="location"
                                            size={24}
                                            color={currentLocation ? "#34C759" : "#FF3B30"}
                                        />
                                        <Text style={styles.statusIconText}>
                                            {currentLocation ? "Location" : "No Location"}
                                        </Text>
                                    </View>
                                    <View style={styles.statusIcon}>
                                        <Ionicons
                                            name="send"
                                            size={24}
                                            color="#34C759"
                                        />
                                        <Text style={styles.statusIconText}>Sent</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Camera Controls in SOS Modal */}
                            <View style={styles.cameraControls}>
                                <Text style={styles.cameraControlsTitle}>
                                    {autoCaptureSOS ? "Capture More Evidence:" : "Manual Evidence Capture:"}
                                </Text>
                                {!autoCaptureSOS && (
                                    <Text style={styles.cameraNote}>
                                        Auto-capture is disabled. Enable it in Profile settings.
                                    </Text>
                                )}
                                <View style={styles.cameraButtonsRow}>
                                    <TouchableOpacity
                                        style={[styles.cameraControlButton, styles.photoButton]}
                                        onPress={takePicture}
                                    >
                                        <Ionicons name="camera" size={20} color="#fff" />
                                        <Text style={styles.cameraControlText}>Photo</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.cameraControlButton, isRecording ? styles.stopButton : styles.videoButton]}
                                        onPress={toggleRecording}
                                    >
                                        <Ionicons
                                            name={isRecording ? "stop" : "videocam"}
                                            size={20}
                                            color="#fff"
                                        />
                                        <Text style={styles.cameraControlText}>
                                            {isRecording ? "Stop" : "Video"}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.cameraControlButton, styles.flashButton]}
                                        onPress={toggleFlash}
                                    >
                                        <Ionicons
                                            name={cameraFlash === 'on' ? "flash" : "flash-off"}
                                            size={20}
                                            color="#fff"
                                        />
                                        <Text style={styles.cameraControlText}>
                                            {cameraFlash === 'on' ? "Flash On" : "Flash Off"}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.cameraControlButton, styles.switchCameraButton]}
                                        onPress={toggleCameraType}
                                    >
                                        <Ionicons name="camera-reverse" size={20} color="#fff" />
                                        <Text style={styles.cameraControlText}>Switch</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Location Display */}
                            <View style={styles.locationContainer}>
                                <Ionicons name="location" size={24} color="#007AFF" />
                                <View style={styles.locationTextContainer}>
                                    <Text style={styles.locationText}>Your Location:</Text>
                                    {currentLocation ? (
                                        <Text style={styles.locationAddress}>
                                            {locationAddress}
                                        </Text>
                                    ) : (
                                        <TouchableOpacity onPress={requestLocationPermission}>
                                            <Text style={styles.locationPermissionText}>
                                                Tap to enable location services
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {/* Next Steps - User chooses what to do next */}
                            <View style={styles.nextStepsContainer}>
                                <Text style={styles.nextStepsTitle}>What would you like to do next?</Text>

                                <View style={styles.emergencyActionsContainer}>
                                    <TouchableOpacity
                                        style={[styles.emergencyButton, styles.policeButton]}
                                        onPress={() => handleEmergencyCall('police')}
                                    >
                                        <Ionicons name="car" size={20} color="#fff" />
                                        <Text style={styles.emergencyButtonText}>Call 999</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.emergencyButton, styles.campusButton]}
                                        onPress={() => handleEmergencyCall('campus')}
                                    >
                                        <Ionicons name="shield-checkmark" size={20} color="#fff" />
                                        <Text style={styles.emergencyButtonText}>Campus</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.emergencyButton, styles.hospitalButton]}
                                        onPress={() => handleEmergencyCall('hospital')}
                                    >
                                        <Ionicons name="medical" size={20} color="#fff" />
                                        <Text style={styles.emergencyButtonText}>Hospital</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Bottom Action Buttons - Fixed at bottom (outside ScrollView) */}
                        <View style={styles.bottomActionsContainer}>
                            <TouchableOpacity
                                style={[styles.bottomActionButton, styles.cancelButton]}
                                onPress={handleCancelSOS}
                            >
                                <Text style={styles.cancelButtonText}>Cancel Emergency</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.bottomActionButton, styles.flashlightButton]}
                                onPress={toggleTorch}
                            >
                                <Ionicons
                                    name={isTorchOn ? 'flashlight' : 'flashlight-outline'}
                                    size={16}
                                    color="#FFD700"
                                />
                                <Text style={styles.flashlightButtonText}>
                                    {isTorchOn ? 'Light On' : 'Light Off'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Notifications Modal */}
            <Modal
                visible={showNotificationsModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowNotificationsModal(false)}
            >
                <View style={styles.sosModalOverlay}>
                    <View style={styles.sosModalContent}>
                        <View style={styles.sosModalHeader}>
                            <TouchableOpacity style={styles.notifCloseBtn} onPress={() => setShowNotificationsModal(false)}>
                                <Ionicons name="close" size={28} color="#666" />
                            </TouchableOpacity>
                            <Ionicons name="notifications" size={40} color="#007AFF" />
                            <Text style={styles.notifTitle}>Notifications</Text>
                            <Text style={styles.sosModalSubtitle}>Your latest updates</Text>
                        </View>

                        {/* Read Aloud Button for Accessibility */}
                        <TouchableOpacity
                            style={styles.readAloudButton}
                            onPress={() => {
                                const notificationText = notifications.map(n =>
                                    `${n.title}. ${n.description}. Received at ${n.time}`
                                ).join('. ');
                                speakNotification(notificationText);
                            }}
                            accessibilityLabel="Read notifications aloud"
                            accessibilityHint="Tap to hear all notifications read aloud"
                        >
                            <Ionicons name="volume-high" size={20} color="#007AFF" />
                            <Text style={styles.readAloudText}>Read Aloud</Text>
                        </TouchableOpacity>
                        <View>
                            {notifications.map(n => (
                                <View key={n.id} style={styles.alertItem}>
                                    <Ionicons name="notifications" size={20} color="#007AFF" />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={{ fontWeight: '600', color: '#1a1a1a' }}>{n.title}</Text>
                                        <Text style={{ color: '#666', marginTop: 2 }}>{n.description}</Text>
                                    </View>
                                    <Text style={styles.alertTime}>{n.time}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Recent Activity Modal */}
            <Modal
                visible={showActivityModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowActivityModal(false)}
            >
                <View style={styles.sosModalOverlay}>
                    <View style={styles.sosModalContent}>
                        <View style={styles.sosModalHeader}>
                            <Ionicons name="pulse" size={40} color="#007AFF" />
                            <Text style={styles.sosModalTitle}>📊 Recent Activity</Text>
                            <Text style={styles.sosModalSubtitle}>Your Safety Summary</Text>
                        </View>

                        <View style={styles.activitySummaryContainer}>
                            {recentActivities.map((activity) => (
                                <View key={activity.id} style={styles.activityStat}>
                                    <Text style={styles.activityStatLabel}>{activity.label}</Text>
                                    <Text style={styles.activityStatValue}>{activity.count}</Text>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.cancelButton} onPress={() => setShowActivityModal(false)}>
                            <Text style={styles.cancelButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 10,
    },
    headerLeft: {
        flex: 1,
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    activityRingButton: {
        padding: 10,
    },
    bellContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e1e5e9',
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    alertsContainer: {
        marginHorizontal: 20,
        marginBottom: 10,
    },
    alertsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    alertsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    viewAllText: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '500',
    },
    alertItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    alertMessage: {
        flex: 1,
        fontSize: 14,
        color: '#1a1a1a',
        marginLeft: 12,
        marginRight: 8,
    },
    alertTime: {
        fontSize: 12,
        color: '#999',
    },
    sosMainContainer: {
        alignItems: 'center',
        marginVertical: 24,
        paddingHorizontal: 20,
    },
    sosCircleButton: {
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: '#ff3b30',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
        marginBottom: 24,
    },
    sosCircleButtonActive: {
        backgroundColor: '#ff6b35',
        transform: [{ scale: 1.05 }],
    },
    sosCircleButtonContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    sosCircleButtonText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 8,
        marginBottom: 4,
    },
    sosCircleButtonSubtext: {
        fontSize: 14,
        color: '#fff',
        textAlign: 'center',
        opacity: 0.9,
    },
    secondaryButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 16,
    },
    secondaryButton: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    secondaryButtonContent: {
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginTop: 8,
    },
    followMeButton: {
        borderWidth: 2,
        borderColor: '#007AFF',
    },
    followMeButtonActive: {
        backgroundColor: '#007AFF',
    },
    followMeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF',
        marginTop: 8,
    },
    torchButton: {
        borderWidth: 2,
        borderColor: '#FFD700',
    },
    torchButtonActive: {
        backgroundColor: '#FFD700',
    },
    torchButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFD700',
        marginTop: 8,
    },
    countdownOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)'
    },
    countdownText: {
        fontSize: 72,
        fontWeight: '800',
        color: '#FF3B30',
    },
    hiddenCameraContainer: {
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
    },
    sosModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollableModalContent: {
        maxHeight: height * 0.6,
    },
    sosModalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        margin: 20,
        width: width - 40,
        maxHeight: height * 0.8,
    },
    sosModalHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    sosModalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF3B30',
        marginTop: 12,
        marginBottom: 4,
    },
    sosModalSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    sosModalTime: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
    },
    silentActionsStatus: {
        marginBottom: 24,
    },
    silentActionsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    statusIconsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 12,
    },
    statusIcon: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    statusIconText: {
        fontSize: 10,
        color: '#666',
        marginTop: 4,
        textAlign: 'center',
    },
    cameraControls: {
        marginBottom: 16,
    },
    cameraControlsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 12,
        textAlign: 'center',
    },
    cameraNote: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        marginBottom: 8,
        fontStyle: 'italic',
    },
    cameraButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    cameraControlButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        borderRadius: 8,
        gap: 4,
    },
    photoButton: {
        backgroundColor: '#34C759',
    },
    videoButton: {
        backgroundColor: '#007AFF',
    },
    stopButton: {
        backgroundColor: '#FF3B30',
    },
    flashButton: {
        backgroundColor: '#FF9500',
    },
    switchCameraButton: {
        backgroundColor: '#5856D6',
    },
    cameraControlText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#f0f8ff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    locationTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    locationText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
        marginBottom: 4,
    },
    locationAddress: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    locationPermissionText: {
        fontSize: 14,
        color: '#007AFF',
        fontStyle: 'italic',
        marginTop: 4,
    },
    nextStepsContainer: {
        marginBottom: 12,
    },
    nextStepsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    emergencyActionsContainer: {
        gap: 8,
        marginBottom: 8,
    },
    emergencyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    campusButton: {
        backgroundColor: '#34C759',
    },
    policeButton: {
        backgroundColor: '#007AFF',
    },
    hospitalButton: {
        backgroundColor: '#FF3B30',
    },
    emergencyButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    bottomActionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
        marginTop: 16,
    },
    bottomActionButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    cancelButton: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e1e5e9',
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    flashlightButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#FFD700',
    },
    flashlightButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFD700',
    },
    notifTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
        marginTop: 8,
    },
    notifCloseBtn: {
        position: 'absolute',
        top: 0,
        right: 0,
        padding: 4,
    },
    readAloudButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f8ff',
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    readAloudText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
        marginLeft: 8,
    },
    activitySummaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    activityStat: {
        alignItems: 'center',
    },
    activityStatLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    activityStatValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
});