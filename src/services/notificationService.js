/**
 * @fileoverview Notification Service
 * Handles push notifications, local notifications, and deep linking
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

// Notification channels for Android
const NOTIFICATION_CHANNELS = {
  DEFAULT: 'default',
  EMERGENCY: 'emergency',
  MESSAGES: 'messages',
  REMINDERS: 'reminders',
  UPDATES: 'updates',
};

/**
 * Initialize notification channels for Android
 */
const initializeNotificationChannels = async () => {
  if (Platform.OS === 'android') {
    // Default channel
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.DEFAULT, {
      name: 'General Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
      sound: 'default',
      enableVibrate: true,
    });

    // Emergency channel
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.EMERGENCY, {
      name: 'Emergency Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#FF0000',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
    });

    // Messages channel
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.MESSAGES, {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250],
      lightColor: '#4A90E2',
      sound: 'default',
      enableVibrate: true,
    });

    // Reminders channel
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.REMINDERS, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFA500',
      sound: 'default',
      enableVibrate: true,
    });

    // Updates channel
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.UPDATES, {
      name: 'Case Updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#50C878',
      sound: 'default',
      enableVibrate: true,
    });
  }
};

/**
 * Request notification permissions and initialize channels
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

    // Initialize notification channels
    await initializeNotificationChannels();

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Get push notification token and register with backend
 * @param {string} userId - User ID to associate with token
 * @returns {Promise<string|null>} Push token or null
 */
export const getPushToken = async (userId = null) => {
  try {
    // Check if running in Expo Go (push notifications not supported)
    const isExpoGo = Platform.OS === 'android' && !Platform.constants?.Brand;
    
    if (isExpoGo) {
      console.warn('Push notifications require a development build. Skipping token registration.');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '3d2e1128-aec2-4008-8b50-bffe426a10c1', // From app.json
    });

    // Register token with backend if userId provided
    if (userId && token.data) {
      await registerPushToken(userId, token.data);
    }

    return token.data;
  } catch (error) {
    // Gracefully handle push token errors (e.g., in Expo Go)
    if (error.message?.includes('development build')) {
      console.warn('Push notifications require a development build. Local notifications will still work.');
    } else {
      console.error('Error getting push token:', error);
    }
    return null;
  }
};

/**
 * Register push token with backend
 * @param {string} userId - User ID
 * @param {string} pushToken - Expo push token
 * @returns {Promise<boolean>} Success status
 */
export const registerPushToken = async (userId, pushToken) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        notification_preferences: {
          push_token: pushToken,
          push_enabled: true,
          updated_at: new Date().toISOString(),
        },
      })
      .eq('id', userId);

    if (error) throw error;

    // Store token locally
    await AsyncStorage.setItem('push_token', pushToken);
    
    return true;
  } catch (error) {
    console.error('Error registering push token:', error);
    return false;
  }
};

/**
 * Unregister push token from backend
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export const unregisterPushToken = async (userId) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        notification_preferences: {
          push_token: null,
          push_enabled: false,
          updated_at: new Date().toISOString(),
        },
      })
      .eq('id', userId);

    if (error) throw error;

    // Remove token locally
    await AsyncStorage.removeItem('push_token');
    
    return true;
  } catch (error) {
    console.error('Error unregistering push token:', error);
    return false;
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
          screen: 'AddStatusUpdate',
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
        badge: 1,
      },
      trigger: {
        seconds: delaySeconds,
        channelId: NOTIFICATION_CHANNELS.REMINDERS,
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
 * Show notification for new case nearby
 * @param {Object} caseData - Case information
 * @returns {Promise<string>} Notification ID
 */
export const showNewCaseNotification = async (caseData) => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 New Emergency Nearby',
        body: `${caseData.animal_type} needs help - ${caseData.distance}km away`,
        data: {
          type: 'new_case',
          caseId: caseData.id,
          screen: 'CaseDetails',
          timestamp: Date.now(),
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 250, 500],
        badge: 1,
      },
      trigger: null, // Show immediately
    });

    await incrementBadgeCount();
    return notificationId;
  } catch (error) {
    console.error('Error showing new case notification:', error);
    throw error;
  }
};

/**
 * Show notification for new message
 * @param {Object} messageData - Message information
 * @returns {Promise<string>} Notification ID
 */
export const showNewMessageNotification = async (messageData) => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `💬 ${messageData.sender_name}`,
        body: messageData.content,
        data: {
          type: 'new_message',
          caseId: messageData.case_id,
          messageId: messageData.id,
          screen: 'CaseDetails',
          timestamp: Date.now(),
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250],
        badge: 1,
      },
      trigger: null,
    });

    await incrementBadgeCount();
    return notificationId;
  } catch (error) {
    console.error('Error showing message notification:', error);
    throw error;
  }
};

/**
 * Show notification for case status update
 * @param {Object} updateData - Update information
 * @returns {Promise<string>} Notification ID
 */
export const showCaseUpdateNotification = async (updateData) => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ Case Update',
        body: `Case ${updateData.case_id.substring(0, 8)} status: ${updateData.new_status}`,
        data: {
          type: 'case_update',
          caseId: updateData.case_id,
          screen: 'CaseDetails',
          timestamp: Date.now(),
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        vibrate: [0, 250],
        badge: 1,
      },
      trigger: null,
    });

    await incrementBadgeCount();
    return notificationId;
  } catch (error) {
    console.error('Error showing case update notification:', error);
    throw error;
  }
};

/**
 * Show notification for case assignment
 * @param {Object} assignmentData - Assignment information
 * @returns {Promise<string>} Notification ID
 */
export const showCaseAssignmentNotification = async (assignmentData) => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 New Case Assigned',
        body: `You've been assigned to help with a ${assignmentData.animal_type}`,
        data: {
          type: 'case_assignment',
          caseId: assignmentData.case_id,
          screen: 'CaseDetails',
          timestamp: Date.now(),
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
        badge: 1,
      },
      trigger: null,
    });

    await incrementBadgeCount();
    return notificationId;
  } catch (error) {
    console.error('Error showing assignment notification:', error);
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
 * Provides deep linking to appropriate screens
 * @param {Function} callback - Callback function to handle navigation
 * @returns {Subscription} Notification subscription
 */
export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(async (response) => {
    const data = response.notification.request.content.data;
    
    // Decrement badge count when notification is tapped
    await decrementBadgeCount();
    
    // Route to appropriate screen based on notification type
    switch (data.type) {
      case 'status_update_reminder':
        callback({
          screen: 'Cases',
          params: {
            screen: 'AddStatusUpdate',
            params: { caseId: data.caseId, fromReminder: true },
          },
        });
        break;
        
      case 'new_case':
      case 'case_update':
      case 'case_assignment':
      case 'new_message':
        callback({
          screen: 'Cases',
          params: {
            screen: 'CaseDetails',
            params: { caseId: data.caseId },
          },
        });
        break;
        
      default:
        // Navigate to notifications screen for unknown types
        callback({
          screen: 'Notifications',
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
 * Handle notification response when app is opened from killed state
 * @returns {Promise<Object|null>} Last notification response or null
 */
export const getLastNotificationResponse = async () => {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response;
  } catch (error) {
    console.error('Error getting last notification response:', error);
    return null;
  }
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
  priority = 'default',
  sound = true,
  vibrate = true,
}) => {
  try {
    const priorityMap = {
      low: Notifications.AndroidNotificationPriority.LOW,
      default: Notifications.AndroidNotificationPriority.DEFAULT,
      high: Notifications.AndroidNotificationPriority.HIGH,
      max: Notifications.AndroidNotificationPriority.MAX,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          ...data,
          timestamp: Date.now(),
        },
        sound: sound ? 'default' : undefined,
        priority: priorityMap[priority] || Notifications.AndroidNotificationPriority.DEFAULT,
        vibrate: vibrate ? [0, 250, 250, 250] : undefined,
        badge: 1,
      },
      trigger: null, // Show immediately
    });

    await incrementBadgeCount();
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
    await Notifications.setBadgeCountAsync(Math.max(0, count));
    await AsyncStorage.setItem('badge_count', count.toString());
    return true;
  } catch (error) {
    console.error('Error setting badge count:', error);
    return false;
  }
};

/**
 * Get current badge count
 * @returns {Promise<number>} Current badge count
 */
export const getBadgeCount = async () => {
  try {
    const stored = await AsyncStorage.getItem('badge_count');
    return stored ? parseInt(stored, 10) : 0;
  } catch (error) {
    console.error('Error getting badge count:', error);
    return 0;
  }
};

/**
 * Increment badge count
 * @returns {Promise<number>} New badge count
 */
export const incrementBadgeCount = async () => {
  try {
    const current = await getBadgeCount();
    const newCount = current + 1;
    await setBadgeCount(newCount);
    return newCount;
  } catch (error) {
    console.error('Error incrementing badge count:', error);
    return 0;
  }
};

/**
 * Decrement badge count
 * @returns {Promise<number>} New badge count
 */
export const decrementBadgeCount = async () => {
  try {
    const current = await getBadgeCount();
    const newCount = Math.max(0, current - 1);
    await setBadgeCount(newCount);
    return newCount;
  } catch (error) {
    console.error('Error decrementing badge count:', error);
    return 0;
  }
};

/**
 * Clear badge count
 * @returns {Promise<boolean>} Success status
 */
export const clearBadgeCount = async () => {
  return await setBadgeCount(0);
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
  registerPushToken,
  unregisterPushToken,
  scheduleStatusUpdateReminder,
  cancelStatusUpdateReminder,
  showNewCaseNotification,
  showNewMessageNotification,
  showCaseUpdateNotification,
  showCaseAssignmentNotification,
  addNotificationResponseListener,
  addNotificationReceivedListener,
  getLastNotificationResponse,
  showImmediateNotification,
  getAllScheduledNotifications,
  cancelAllNotifications,
  setBadgeCount,
  getBadgeCount,
  incrementBadgeCount,
  decrementBadgeCount,
  clearBadgeCount,
};
