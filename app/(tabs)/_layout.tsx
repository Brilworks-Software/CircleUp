import { Stack } from 'expo-router';
import { Chrome as Home, Bell, Users, Settings } from 'lucide-react-native';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { updateUserFCMToken } from '@/services/PushNotificationService';

export default function TabLayout() {
  useEffect(() => {
    // Register for push notifications and update FCM token on mobile only
    if (Platform.OS !== 'web') {
      updateUserFCMToken();
    }
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        
        
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Home',
          
        }}
      />
      <Stack.Screen
        name="reminders"
        options={{
          title: 'Reminders',
          
        }}
      />
      <Stack.Screen
        name="relationships"
        options={{
          title: 'Relationships',
          
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
          
        }}
      />
    </Stack>
  );
}