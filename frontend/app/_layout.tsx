import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function RootLayout() {
  return (
    <Stack screenOptions={{
      headerShown: false,
      animation: Platform.OS === 'web' ? 'none' : 'default',
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="deliver"
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen name="delivery-detail" />
    </Stack>
  );
}
