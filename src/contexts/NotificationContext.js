/**
 * @fileoverview Notification Context
 * Manages push notifications and deep linking throughout the app
 */
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import notificationService from '../services/notificationService';
import { useAuth } from './AuthContext';

const NotificationContext = createContext({});

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children, navigation }) => {
  const { user } = useAuth();
  const [badgeCount, setBadgeCount] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();
  const appState = useRef(AppState.currentState);

  // Initialize notifications
  useEffect(() => {
    initializeNotifications();
    
    // Handle app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  // Setup notification listeners when user is authenticated
  useEffect(() => {
    if (user && hasPermission) {
      setupNotificationListeners();
    }

    return () => {
      // Use remove() method instead of removeNotificationSubscription
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user, hasPermission]);

  // Update badge count periodically
  useEffect(() => {
    if (user) {
      updateBadgeCount();
    }
  }, [user]);

  const initializeNotifications = async () => {
    try {
      // Request permissions
      const granted = await notificationService.requestNotificationPermissions();
      setHasPermission(granted);

      if (granted && user) {
        // Get push token (will gracefully fail in Expo Go)
        try {
          const token = await notificationService.getPushToken(user.id);
          setExpoPushToken(token);
        } catch (error) {
          // Push tokens not available in Expo Go, but local notifications still work
          console.log('Push token not available (this is normal in Expo Go)');
        }
      }

      // Check for notification that opened the app
      const lastResponse = await notificationService.getLastNotificationResponse();
      if (lastResponse && navigation) {
        handleNotificationResponse(lastResponse.notification.request.content.data);
      }

      // Update badge count
      await updateBadgeCount();
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  const setupNotificationListeners = () => {
    // Handle notifications received while app is in foreground
    notificationListener.current = notificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        updateBadgeCount();
      }
    );

    // Handle notification taps
    responseListener.current = notificationService.addNotificationResponseListener(
      (navigationData) => {
        if (navigation) {
          handleNotificationNavigation(navigationData);
        }
      }
    );
  };

  const handleNotificationNavigation = (navigationData) => {
    try {
      if (navigationData.screen) {
        if (navigationData.params) {
          navigation.navigate(navigationData.screen, navigationData.params);
        } else {
          navigation.navigate(navigationData.screen);
        }
      }
      updateBadgeCount();
    } catch (error) {
      console.error('Error navigating from notification:', error);
    }
  };

  const handleNotificationResponse = (data) => {
    if (!navigation || !data) return;

    try {
      switch (data.type) {
        case 'status_update_reminder':
          navigation.navigate('Cases', {
            screen: 'AddStatusUpdate',
            params: { caseId: data.caseId, fromReminder: true },
          });
          break;

        case 'new_case':
        case 'case_update':
        case 'case_assignment':
        case 'new_message':
          navigation.navigate('Cases', {
            screen: 'CaseDetails',
            params: { caseId: data.caseId },
          });
          break;

        default:
          navigation.navigate('Notifications');
      }
    } catch (error) {
      console.error('Error handling notification response:', error);
    }
  };

  const handleAppStateChange = async (nextAppState) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App has come to foreground
      await updateBadgeCount();
    }
    appState.current = nextAppState;
  };

  const updateBadgeCount = async () => {
    try {
      const count = await notificationService.getBadgeCount();
      setBadgeCount(count);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  };

  const clearBadge = async () => {
    try {
      await notificationService.clearBadgeCount();
      setBadgeCount(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  };

  const scheduleReminder = async (caseId, delaySeconds = 3600) => {
    try {
      if (!hasPermission) {
        const granted = await notificationService.requestNotificationPermissions();
        if (!granted) {
          throw new Error('Notification permissions not granted');
        }
      }

      const notificationId = await notificationService.scheduleStatusUpdateReminder({
        caseId,
        delaySeconds,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      throw error;
    }
  };

  const cancelReminder = async (caseId) => {
    try {
      await notificationService.cancelStatusUpdateReminder(caseId);
    } catch (error) {
      console.error('Error canceling reminder:', error);
    }
  };

  const showNotification = async (type, data) => {
    try {
      if (!hasPermission) return;

      switch (type) {
        case 'new_case':
          await notificationService.showNewCaseNotification(data);
          break;
        case 'new_message':
          await notificationService.showNewMessageNotification(data);
          break;
        case 'case_update':
          await notificationService.showCaseUpdateNotification(data);
          break;
        case 'case_assignment':
          await notificationService.showCaseAssignmentNotification(data);
          break;
        default:
          await notificationService.showImmediateNotification(data);
      }

      await updateBadgeCount();
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  const value = {
    badgeCount,
    hasPermission,
    expoPushToken,
    scheduleReminder,
    cancelReminder,
    showNotification,
    clearBadge,
    updateBadgeCount,
    requestPermissions: initializeNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
