import { Stack } from 'expo-router';
import { Chrome as Home, Bell, Users, Settings } from 'lucide-react-native';

export default function TabLayout() {
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