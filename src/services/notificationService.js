/**
 * @fileoverview Notification Service
 * Handles push notifications and reminder notifications
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 * @returns {Promise<boolean>} Whether permissions were granted
 */
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }

    // Get push token for remote notifications
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Get push notification token
 * @returns {Promise<string|null>} Push token or null
 */
export const getPushToken = async () => {
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

/**
 * Schedule a local notification for status update reminder
 * @param {Object} params - Notification parameters
 * @param {string} params.caseId - Case ID
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {number} params.delaySeconds - Delay in seconds before showing notification
 * @returns {Promise<string>} Notification ID
 */
export const scheduleStatusUpdateReminder = async ({
  caseId,
  title = 'Status Update Required',
  body = 'Please provide a status update for your assigned case',
  delaySeconds = 3600, // Default 1 hour
}) => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: 'status_update_reminder',
          caseId,
          timestamp: Date.now(),
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        seconds: delaySeconds,
      },
    });

    // Store notification ID for potential cancellation
    await storeNotificationId(caseId, notificationId);

    return notificationId;
  } catch (error) {
    console.error('Error scheduling reminder:', error);
    throw error;
  }
};

/**
 * Cancel a scheduled reminder notification
 * @param {string} caseId - Case ID
 * @returns {Promise<boolean>} Whether cancellation was successful
 */
export const cancelStatusUpdateReminder = async (caseId) => {
  try {
    const notificationId = await getNotificationId(caseId);
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      await removeNotificationId(caseId);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error canceling reminder:', error);
    return false;
  }
};

/**
 * Handle notification response (when user taps notification)
 * @param {Function} callback - Callback function to handle navigation
 * @returns {Subscription} Notification subscription
 */
export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    
    if (data.type === 'status_update_reminder' && data.caseId) {
      callback({
        type: 'status_update',
        caseId: data.caseId,
        fromReminder: true,
      });
    }
  });
};

/**
 * Handle notification received while app is in foreground
 * @param {Function} callback - Callback function
 * @returns {Subscription} Notification subscription
 */
export const addNotificationReceivedListener = (callback) => {
  return Notifications.addNotificationReceivedListener((notification) => {
    callback(notification);
  });
};

/**
 * Show immediate local notification
 * @param {Object} params - Notification parameters
 * @returns {Promise<string>} Notification ID
 */
export const showImmediateNotification = async ({
  title,
  body,
  data = {},
}) => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Show immediately
    });

    return notificationId;
  } catch (error) {
    console.error('Error showing notification:', error);
    throw error;
  }
};

/**
 * Get all scheduled notifications
 * @returns {Promise<Array>} Array of scheduled notifications
 */
export const getAllScheduledNotifications = async () => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};

/**
 * Cancel all scheduled notifications
 * @returns {Promise<void>}
 */
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem('notification_ids');
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
};

/**
 * Set notification badge count
 * @param {number} count - Badge count
 * @returns {Promise<boolean>} Whether setting was successful
 */
export const setBadgeCount = async (count) => {
  try {
    await Notifications.setBadgeCountAsync(count);
    return true;
  } catch (error) {
    console.error('Error setting badge count:', error);
    return false;
  }
};

// Helper functions for storing notification IDs

const storeNotificationId = async (caseId, notificationId) => {
  try {
    const stored = await AsyncStorage.getItem('notification_ids');
    const ids = stored ? JSON.parse(stored) : {};
    ids[caseId] = notificationId;
    await AsyncStorage.setItem('notification_ids', JSON.stringify(ids));
  } catch (error) {
    console.error('Error storing notification ID:', error);
  }
};

const getNotificationId = async (caseId) => {
  try {
    const stored = await AsyncStorage.getItem('notification_ids');
    const ids = stored ? JSON.parse(stored) : {};
    return ids[caseId] || null;
  } catch (error) {
    console.error('Error getting notification ID:', error);
    return null;
  }
};

const removeNotificationId = async (caseId) => {
  try {
    const stored = await AsyncStorage.getItem('notification_ids');
    const ids = stored ? JSON.parse(stored) : {};
    delete ids[caseId];
    await AsyncStorage.setItem('notification_ids', JSON.stringify(ids));
  } catch (error) {
    console.error('Error removing notification ID:', error);
  }
};

export default {
  requestNotificationPermissions,
  getPushToken,
  scheduleStatusUpdateReminder,
  cancelStatusUpdateReminder,
  addNotificationResponseListener,
  addNotificationReceivedListener,
  showImmediateNotification,
  getAllScheduledNotifications,
  cancelAllNotifications,
  setBadgeCount,
};
