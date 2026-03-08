import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function RootLayout() {
  useEffect(() => {
    // Prevent memory leaks
    return () => {
      // Cleanup
    };
  }, []);

  return (
    <Stack screenOptions={{
      headerShown: false,
      animation: Platform.OS === 'web' ? 'none' : 'default',
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="auth-callback" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="deliver"
        options={{
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
