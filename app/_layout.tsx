import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import 'react-native-reanimated';

import { EngineerProvider } from '@/context/EngineerContext';

// Ignore non-fatal development warnings in Expo Go
LogBox.ignoreLogs([
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'expo-notifications: Android Push notifications',
  'SafeAreaView has been deprecated',
]);

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <EngineerProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: 'modal', title: 'Thông tin hệ thống' }}
          />
        </Stack>
        <StatusBar style="light" />
      </EngineerProvider>
    </ThemeProvider>
  );
}
