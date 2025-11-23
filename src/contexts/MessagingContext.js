/**
 * @fileoverview Messaging Context
 * Provides real-time messaging state and subscriptions across the app
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import messagingService from '../services/messagingService';

const MessagingContext = createContext();

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};

export const MessagingProvider = ({ children }) => {
  const { user } = useAuth();
  const [activeSubscriptions, setActiveSubscriptions] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
  const subscriptionsRef = useRef({});

  /**
   * Subscribe to messages for a case
   */
  const subscribeToCase = useCallback((caseId, onMessage) => {
    if (!caseId || subscriptionsRef.current[caseId]) {
      return; // Already subscribed
    }

    const subscription = messagingService.subscribeToMessages(
      caseId,
      (message) => {
        // Mark message as read if it's not from current user
        if (user && message.sender_id !== user.id) {
          messagingService.markMessageAsRead(message.id, user.id);
        }
        
        // Update unread count
        updateUnreadCount(caseId);
        
        // Call callback
        if (onMessage) {
          onMessage(message);
        }
      },
      (error) => {
        console.error('Message subscription error:', error);
      }
    );

    subscriptionsRef.current[caseId] = subscription;
    setActiveSubscriptions(prev => ({ ...prev, [caseId]: true }));

    // Fetch initial unread count
    updateUnreadCount(caseId);
  }, [user]);

  /**
   * Unsubscribe from messages for a case
   */
  const unsubscribeFromCase = useCallback((caseId) => {
    const subscription = subscriptionsRef.current[caseId];
    if (subscription) {
      subscription.unsubscribe();
      delete subscriptionsRef.current[caseId];
      setActiveSubscriptions(prev => {
        const newState = { ...prev };
        delete newState[caseId];
        return newState;
      });
    }
  }, []);

  /**
   * Subscribe to presence for a case
   */
  const subscribeToPresence = useCallback(async (caseId, userInfo) => {
    if (!user || !caseId) return;

    const presenceKey = `${caseId}_presence`;
    if (subscriptionsRef.current[presenceKey]) {
      return; // Already subscribed
    }

    const subscription = await messagingService.subscribeToPresence(
      caseId,
      user.id,
      userInfo || { name: user.name, user_type: user.user_type },
      (users) => {
        setOnlineUsers(prev => ({ ...prev, [caseId]: users }));
      }
    );

    subscriptionsRef.current[presenceKey] = subscription;
  }, [user]);

  /**
   * Unsubscribe from presence for a case
   */
  const unsubscribeFromPresence = useCallback((caseId) => {
    const presenceKey = `${caseId}_presence`;
    const subscription = subscriptionsRef.current[presenceKey];
    if (subscription) {
      subscription.unsubscribe();
      delete subscriptionsRef.current[presenceKey];
      setOnlineUsers(prev => {
        const newState = { ...prev };
        delete newState[caseId];
        return newState;
      });
    }
  }, []);

  /**
   * Update unread count for a case
   */
  const updateUnreadCount = useCallback(async (caseId) => {
    if (!user) return;

    const result = await messagingService.getUnreadCount(caseId, user.id);
    if (result.success) {
      setUnreadCounts(prev => ({ ...prev, [caseId]: result.count }));
    }
  }, [user]);

  /**
   * Send a message
   */
  const sendMessage = useCallback(async (caseId, messageData) => {
    return await messagingService.sendMessage(caseId, messageData);
  }, []);

  /**
   * Get messages for a case
   */
  const getMessages = useCallback(async (caseId, options) => {
    return await messagingService.getMessages(caseId, options);
  }, []);

  /**
   * Upload chat image
   */
  const uploadChatImage = useCallback(async (imageUri, caseId) => {
    return await messagingService.uploadChatImage(imageUri, caseId);
  }, []);

  /**
   * Mark message as read
   */
  const markAsRead = useCallback(async (messageId) => {
    if (!user) return;
    return await messagingService.markMessageAsRead(messageId, user.id);
  }, [user]);

  /**
   * Get total unread count across all cases
   */
  const getTotalUnreadCount = useCallback(() => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  }, [unreadCounts]);

  /**
   * Cleanup all subscriptions on unmount
   */
  useEffect(() => {
    return () => {
      Object.keys(subscriptionsRef.current).forEach(key => {
        const subscription = subscriptionsRef.current[key];
        if (subscription && subscription.unsubscribe) {
          subscription.unsubscribe();
        }
      });
      subscriptionsRef.current = {};
    };
  }, []);

  const value = {
    // State
    activeSubscriptions,
    unreadCounts,
    onlineUsers,
    
    // Methods
    subscribeToCase,
    unsubscribeFromCase,
    subscribeToPresence,
    unsubscribeFromPresence,
    sendMessage,
    getMessages,
    uploadChatImage,
    markAsRead,
    updateUnreadCount,
    getTotalUnreadCount,
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
};

export default MessagingContext;
