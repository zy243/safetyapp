// app/_layout.tsx
import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { SOSProvider } from "../contexts/SOSContext";
import { AlarmProvider } from "../contexts/AlarmContext";
import LoadingScreen from "../components/LoadingScreen";
import NotificationService from "../services/NotificationService";
import { useEffect } from "react";
import "react-native-get-random-values";

function LayoutContent() {
  const { isLoading, user, updatePushToken } = useAuth();

  // Initialize notification service when user is logged in
  useEffect(() => {
    if (user) {
      NotificationService.initialize(user.id, updatePushToken);
    }
  }, [user, updatePushToken]);

  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {user ? (
        // User is logged in → show main app
        <>

          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(guardianTabs)" />
          <Stack.Screen name="staff" />
        </>
      ) : (
        // User not logged in → show login
        <Stack.Screen name="login" /> 
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SOSProvider>
        <AlarmProvider>
          <LayoutContent />
        </AlarmProvider>
      </SOSProvider>
    </AuthProvider>
  );
}