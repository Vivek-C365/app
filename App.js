/**
 * Animal Rescue Mobile App
 * Main entry point with navigation
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// import ErrorBoundary from './src/components/ErrorBoundary';
import TabNavigator from './src/navigation/TabNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor="#000000" />
        <TabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
