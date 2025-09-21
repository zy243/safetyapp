// services/NotificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  static async requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return false;
    }
    
    return true;
  }

  static async getPushToken() {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-project-id',
      });
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  static async scheduleLocalNotification(title: string, body: string, data?: any) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  static async scheduleGuardianNotification(
    studentName: string,
    destination: string,
    data?: any
  ) {
    const title = '🛡️ Guardian Mode Activated';
    const body = `${studentName} has activated Guardian mode and is traveling to ${destination}. You can monitor their journey in real-time.`;
    
    await this.scheduleLocalNotification(title, body, {
      type: 'guardian_activated',
      studentName,
      destination,
      ...data,
    });
  }

  static async scheduleGuardianPushNotification(guardianId: string, notificationData: any) {
    try {
      const title = '🛡️ Student Guardian Mode';
      const body = notificationData.message || 'A student has activated Guardian mode. Tap to view their location.';
      
      await this.scheduleLocalNotification(title, body, {
        type: 'guardian_activated',
        guardianId,
        ...notificationData
      });
    } catch (error) {
      console.error('Error scheduling guardian push notification:', error);
    }
  }

  static async scheduleEmergencyNotification(
    studentName: string,
    location: string,
    alertType: string = 'SOS',
    data?: any
  ) {
    const title = `🚨 ${alertType} Alert`;
    const body = `${studentName} has sent an ${alertType} alert and may need immediate help.`;
    
    await this.scheduleLocalNotification(title, body, {
      type: 'emergency_alert',
      studentName,
      location,
      alertType,
      priority: 'high',
      ...data,
    });
  }

  static async scheduleSafetyAlert(
    incidentType: string,
    location: string,
    time: string,
    data?: any
  ) {
    const title = `⚠️ ${incidentType} Reported`;
    const body = `${incidentType} reported at ${location} at ${time}. Stay alert and avoid the area if possible.`;
    
    await this.scheduleLocalNotification(title, body, {
      type: 'safety_alert',
      incidentType,
      location,
      time,
      ...data,
    });
  }

  static async scheduleGuardianUpdateNotification(
    studentName: string,
    message: string,
    data?: any
  ) {
    const title = '🛡️ Guardian Update';
    const body = message;
    
    await this.scheduleLocalNotification(title, body, {
      type: 'guardian_update',
      studentName,
      ...data,
    });
  }

  static async scheduleGuardianCompletedNotification(
    studentName: string,
    destination: string,
    data?: any
  ) {
    const title = '✅ Guardian Mode Completed';
    const body = `${studentName} has safely completed their journey to ${destination}.`;
    
    await this.scheduleLocalNotification(title, body, {
      type: 'guardian_completed',
      studentName,
      destination,
      ...data,
    });
  }

  static async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  static async cancelNotification(notificationId: string) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  // Listen for notification responses
  static addNotificationResponseListener(callback: (response: any) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Listen for notifications received while app is in foreground
  static addNotificationReceivedListener(callback: (notification: any) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Initialize notification service with user's push token
  static async initialize(userId: string, updatePushToken: (token: string) => Promise<void>) {
    try {
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Notification permissions not granted');
        return;
      }

      // Get push token
      const pushToken = await this.getPushToken();
      if (pushToken) {
        // Update user's push token in backend
        await updatePushToken(pushToken);
        console.log('Push token updated:', pushToken);
      }

      // Set up notification listeners
      this.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
        // Handle different notification types
        this.handleNotificationReceived(notification);
      });

      this.addNotificationResponseListener((response) => {
        console.log('Notification response:', response);
        // Handle notification tap
        this.handleNotificationResponse(response);
      });

    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  // Handle different types of notifications
  private static handleNotificationReceived(notification: any) {
    const { data } = notification.request.content;
    
    switch (data?.type) {
      case 'guardian_activated':
        console.log('Guardian mode activated notification received');
        break;
      case 'guardian_update':
        console.log('Guardian update notification received');
        break;
      case 'guardian_completed':
        console.log('Guardian completed notification received');
        break;
      case 'emergency_alert':
        console.log('Emergency alert notification received');
        break;
      case 'safety_alert':
        console.log('Safety alert notification received');
        break;
      default:
        console.log('Unknown notification type:', data?.type);
    }
  }

  // Handle notification tap/response
  private static handleNotificationResponse(response: any) {
    const { data } = response.notification.request.content;
    
    switch (data?.type) {
      case 'guardian_activated':
        // Navigate to guardian monitoring screen with session data
        console.log('Navigate to guardian monitoring with session:', data.sessionId);
        // Store session data for navigation
        if (data.sessionId) {
          // Store session data in AsyncStorage for deep linking
          this.storeSessionDataForDeepLink(data);
          console.log('Session data stored for deep linking:', data);
        }
        // Handle deep linking
        if (data.deepLink) {
          this.handleDeepLink(data.deepLink);
        }
        // In a real app, you would use navigation here
        // For example: navigation.navigate('/(guardianTabs)/monitor', { sessionId: data.sessionId });
        break;
      case 'guardian_update':
        // Navigate to guardian monitoring screen
        console.log('Navigate to guardian monitoring for update');
        break;
      case 'guardian_completed':
        // Navigate to guardian monitoring screen
        console.log('Navigate to guardian monitoring for completion');
        break;
      case 'emergency_alert':
        // Navigate to emergency screen
        console.log('Navigate to emergency screen');
        break;
      case 'safety_alert':
        // Navigate to safety alerts screen
        console.log('Navigate to safety alerts');
        break;
      default:
        console.log('Handle notification response:', data?.type);
    }
  }

  // Store session data for deep linking
  private static async storeSessionDataForDeepLink(data: any) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('pendingSessionData', JSON.stringify(data));
    } catch (error) {
      console.error('Error storing session data for deep link:', error);
    }
  }

  // Handle deep linking
  private static handleDeepLink(deepLink: string) {
    console.log('Handling deep link:', deepLink);
    // Parse the deep link URL
    const url = new URL(deepLink);
    const path = url.pathname;
    const params = new URLSearchParams(url.search);
    
    if (path.includes('/guardian/monitor')) {
      const sessionId = params.get('sessionId');
      const studentId = params.get('studentId');
      
      console.log('Deep link to guardian monitor:', { sessionId, studentId });
      
      // Store the session data for the monitor screen
      this.storeSessionDataForDeepLink({
        sessionId,
        studentId,
        action: 'view_location'
      });
    }
  }

  // Get stored session data for deep linking
  static async getStoredSessionData() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const data = await AsyncStorage.getItem('pendingSessionData');
      if (data) {
        const sessionData = JSON.parse(data);
        // Clear the stored data after retrieving
        await AsyncStorage.removeItem('pendingSessionData');
        return sessionData;
      }
      return null;
    } catch (error) {
      console.error('Error getting stored session data:', error);
      return null;
    }
  }
}

export default NotificationService;