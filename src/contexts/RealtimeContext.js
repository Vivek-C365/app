/**
 * @fileoverview Realtime Context
 * Provides centralized Realtime subscription management across the app
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import realtimeService from '../services/realtimeService';

const RealtimeContext = createContext();

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

export const RealtimeProvider = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(true);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [subscriptionErrors, setSubscriptionErrors] = useState({});
  const appState = useRef(AppState.currentState);
  const subscriptionsRef = useRef({});

  /**
   * Handle app state changes for connection management
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  /**
   * Cleanup all subscriptions on unmount or user logout
   */
  useEffect(() => {
    if (!user) {
      cleanupAllSubscriptions();
    }

    return () => {
      cleanupAllSubscriptions();
    };
  }, [user]);

  /**
   * Update active subscriptions list periodically
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const subs = realtimeService.getActiveSubscriptions();
      setActiveSubscriptions(subs);
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleAppStateChange = (nextAppState) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App has come to foreground - check connection
      setIsConnected(true);
    } else if (
      appState.current === 'active' &&
      nextAppState.match(/inactive|background/)
    ) {
      // App going to background
      console.log('App going to background, subscriptions will be maintained');
    }
    appState.current = nextAppState;
  };

  /**
   * Subscribe to new cases
   */
  const subscribeToNewCases = useCallback((onNewCase, options = {}) => {
    const key = 'new-cases';
    
    if (subscriptionsRef.current[key]) {
      console.log('Already subscribed to new cases');
      return subscriptionsRef.current[key];
    }

    const handleError = (error) => {
      console.error('New cases subscription error:', error);
      setSubscriptionErrors(prev => ({ ...prev, [key]: error.message }));
      setIsConnected(false);
    };

    const subscription = realtimeService.subscribeToNewCases(
      (caseData) => {
        setIsConnected(true);
        setSubscriptionErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
        if (onNewCase) onNewCase(caseData);
      },
      handleError,
      options
    );

    subscriptionsRef.current[key] = subscription;
    return subscription;
  }, []);

  /**
   * Subscribe to case updates
   */
  const subscribeToCaseUpdates = useCallback((caseId, onUpdate) => {
    const key = caseId ? `case-updates:${caseId}` : 'case-updates:all';
    
    if (subscriptionsRef.current[key]) {
      console.log(`Already subscribed to case updates: ${key}`);
      return subscriptionsRef.current[key];
    }

    const handleError = (error) => {
      console.error('Case updates subscription error:', error);
      setSubscriptionErrors(prev => ({ ...prev, [key]: error.message }));
      setIsConnected(false);
    };

    const subscription = realtimeService.subscribeToCaseUpdates(
      caseId,
      (updateData) => {
        setIsConnected(true);
        setSubscriptionErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
        if (onUpdate) onUpdate(updateData);
      },
      handleError
    );

    subscriptionsRef.current[key] = subscription;
    return subscription;
  }, []);

  /**
   * Subscribe to status updates for a case
   */
  const subscribeToStatusUpdates = useCallback((caseId, onStatusUpdate) => {
    const key = `status-updates:${caseId}`;
    
    if (subscriptionsRef.current[key]) {
      console.log(`Already subscribed to status updates: ${key}`);
      return subscriptionsRef.current[key];
    }

    const handleError = (error) => {
      console.error('Status updates subscription error:', error);
      setSubscriptionErrors(prev => ({ ...prev, [key]: error.message }));
      setIsConnected(false);
    };

    const subscription = realtimeService.subscribeToStatusUpdates(
      caseId,
      (statusData) => {
        setIsConnected(true);
        setSubscriptionErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
        if (onStatusUpdate) onStatusUpdate(statusData);
      },
      handleError
    );

    subscriptionsRef.current[key] = subscription;
    return subscription;
  }, []);

  /**
   * Subscribe to messages for a case
   */
  const subscribeToMessages = useCallback((caseId, onMessage) => {
    const key = `messages:${caseId}`;
    
    if (subscriptionsRef.current[key]) {
      console.log(`Already subscribed to messages: ${key}`);
      return subscriptionsRef.current[key];
    }

    const handleError = (error) => {
      console.error('Messages subscription error:', error);
      setSubscriptionErrors(prev => ({ ...prev, [key]: error.message }));
      setIsConnected(false);
    };

    const subscription = realtimeService.subscribeToMessages(
      caseId,
      (messageData) => {
        setIsConnected(true);
        setSubscriptionErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
        if (onMessage) onMessage(messageData);
      },
      handleError
    );

    subscriptionsRef.current[key] = subscription;
    return subscription;
  }, []);

  /**
   * Subscribe to presence for a case
   */
  const subscribeToPresence = useCallback(async (caseId, userInfo, onPresenceChange) => {
    if (!user) {
      console.error('User not authenticated');
      return { track: () => {}, unsubscribe: () => {} };
    }

    const key = `presence:${caseId}`;
    
    if (subscriptionsRef.current[key]) {
      console.log(`Already subscribed to presence: ${key}`);
      return subscriptionsRef.current[key];
    }

    const handleError = (error) => {
      console.error('Presence subscription error:', error);
      setSubscriptionErrors(prev => ({ ...prev, [key]: error.message }));
      setIsConnected(false);
    };

    const subscription = await realtimeService.subscribeToPresence(
      caseId,
      user.id,
      userInfo || { name: user.name, user_type: user.user_type },
      (presenceData) => {
        setIsConnected(true);
        setSubscriptionErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
        if (onPresenceChange) onPresenceChange(presenceData);
      },
      handleError
    );

    subscriptionsRef.current[key] = subscription;
    return subscription;
  }, [user]);

  /**
   * Subscribe to case assignments for current user
   */
  const subscribeToAssignments = useCallback((onAssignment) => {
    if (!user) {
      console.error('User not authenticated');
      return { unsubscribe: () => {} };
    }

    const key = `assignments:${user.id}`;
    
    if (subscriptionsRef.current[key]) {
      console.log('Already subscribed to assignments');
      return subscriptionsRef.current[key];
    }

    const handleError = (error) => {
      console.error('Assignments subscription error:', error);
      setSubscriptionErrors(prev => ({ ...prev, [key]: error.message }));
      setIsConnected(false);
    };

    const subscription = realtimeService.subscribeToAssignments(
      user.id,
      (assignmentData) => {
        setIsConnected(true);
        setSubscriptionErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
        if (onAssignment) onAssignment(assignmentData);
      },
      handleError
    );

    subscriptionsRef.current[key] = subscription;
    return subscription;
  }, [user]);

  /**
   * Unsubscribe from a specific subscription
   */
  const unsubscribe = useCallback(async (key) => {
    const subscription = subscriptionsRef.current[key];
    if (subscription) {
      await subscription.unsubscribe();
      delete subscriptionsRef.current[key];
      setSubscriptionErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  }, []);

  /**
   * Cleanup all subscriptions
   */
  const cleanupAllSubscriptions = useCallback(async () => {
    console.log('Cleaning up all Realtime subscriptions...');
    
    // Unsubscribe from all tracked subscriptions
    const keys = Object.keys(subscriptionsRef.current);
    for (const key of keys) {
      await unsubscribe(key);
    }

    // Also cleanup any subscriptions in the service
    await realtimeService.unsubscribeAll();
    
    subscriptionsRef.current = {};
    setActiveSubscriptions([]);
    setSubscriptionErrors({});
  }, [unsubscribe]);

  /**
   * Get subscription state
   */
  const getSubscriptionState = useCallback((channelName) => {
    return realtimeService.getSubscriptionState(channelName);
  }, []);

  /**
   * Get active subscription count
   */
  const getActiveCount = useCallback(() => {
    return realtimeService.getActiveSubscriptionCount();
  }, []);

  /**
   * Check if a specific subscription is active
   */
  const isSubscribed = useCallback((key) => {
    return !!subscriptionsRef.current[key];
  }, []);

  const value = {
    // State
    isConnected,
    activeSubscriptions,
    subscriptionErrors,
    
    // Subscription methods
    subscribeToNewCases,
    subscribeToCaseUpdates,
    subscribeToStatusUpdates,
    subscribeToMessages,
    subscribeToPresence,
    subscribeToAssignments,
    
    // Management methods
    unsubscribe,
    cleanupAllSubscriptions,
    getSubscriptionState,
    getActiveCount,
    isSubscribed,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

export default RealtimeContext;
