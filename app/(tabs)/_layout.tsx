import { Stack } from 'expo-router';
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