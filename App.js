/**
 * Animal Rescue Mobile App
 * Main entry point with navigation and deep linking
 */
import 'react-native-gesture-handler';
import React, { useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { MessagingProvider } from './src/contexts/MessagingContext';
import { RealtimeProvider } from './src/contexts/RealtimeContext';
import { OfflineProvider } from './src/contexts/OfflineContext';
import RootNavigator from './src/navigation/RootNavigator';

// Deep linking configuration
const linking = {
  prefixes: ['animalrescue://', 'https://animalrescue.app'],
  config: {
    screens: {
      Cases: {
        screens: {
          CasesList: 'cases',
          CaseDetails: 'cases/:caseId',
          AddStatusUpdate: 'cases/:caseId/status-update',
          AIEmergency: 'cases/:caseId/ai-emergency',
        },
      },
      Search: 'search',
      Report: 'report',
      Notifications: 'notifications',
      Profile: {
        screens: {
          ProfileMain: 'profile',
          EditProfile: 'profile/edit',
          ServiceAreas: 'profile/service-areas',
          Verification: 'profile/verification',
          Settings: 'profile/settings',
        },
      },
    },
  },
};

export default function App() {
  const navigationRef = useRef();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OfflineProvider>
          <RealtimeProvider>
            <MessagingProvider>
              <NavigationContainer ref={navigationRef} linking={linking}>
                <NotificationProvider navigation={navigationRef.current}>
                  <StatusBar style="light" backgroundColor="#000000" translucent={false} />
                  <RootNavigator />
                  <Toast />
                </NotificationProvider>
              </NavigationContainer>
            </MessagingProvider>
          </RealtimeProvider>
        </OfflineProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
