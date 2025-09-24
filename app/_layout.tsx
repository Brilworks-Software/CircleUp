import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import NotificationService from '../services/NotificationService';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // Initialize notification service when app starts
    const initializeNotifications = async () => {
      try {
        const notificationService = NotificationService.getInstance();
        const initialized = await notificationService.initialize();
        
        if (initialized) {
          console.log('Notification service initialized successfully');
        } else {
          console.warn('Notification service initialization failed');
        }
      } catch (error) {
        console.error('Error initializing notification service:', error);
      }
    };

    initializeNotifications();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
