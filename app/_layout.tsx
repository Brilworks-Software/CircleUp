import { useEffect } from 'react';
import { Stack, usePathname, useNavigationContainerRef } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { GestureHandlerRootView, GestureDetector } from 'react-native-gesture-handler';

// Analytics imports
import { registerSessionTracking } from '@/src/analytics/events/SessionTracker';
import { registerButtonTracking } from '@/src/analytics/events/ButtonTracker';
import { registerNavigationTracking } from '@/src/analytics/events/NavigationTracker';
import { createTouchGesture } from '@/src/analytics/events/TouchTracker';
import { trackScreenView } from '@/src/analytics/events/ScreenTracker';

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
  const navRef = useNavigationContainerRef();

  useEffect(() => {
    // INIT ANALYTICS ONCE
    registerSessionTracking();
    registerButtonTracking();

    // REGISTER NAVIGATION TRACKING
    // We delay slightly to ensure navigation is mounted and ref is populated
    const timeoutId = setTimeout(() => {
      registerNavigationTracking(navRef);
    }, 100);

    // SCREEN VIEW TRACKING
    // Listen to state changes to track screen views
    const unsubscribe = navRef.addListener("state", () => {
      const route = navRef.getCurrentRoute() as any;
      if (route) {
        trackScreenView(route.name);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [navRef]);

  // TOUCH TRACKER
  const gesture = createTouchGesture();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <GestureDetector gesture={gesture}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="+not-found" />
            </Stack>
          </GestureDetector>
          <StatusBar style="dark" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
