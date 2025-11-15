/**
 * Animal Rescue Mobile App
 * Main entry point with navigation
 */
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#000000" />
          <RootNavigator />
          <Toast />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
