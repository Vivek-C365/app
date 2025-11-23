/**
 * @fileoverview Realtime Subscription Service
 * Centralized service for managing all Supabase Realtime subscriptions
 * Handles new cases, case updates, messages, and presence tracking
 */
import { supabase } from '../config/supabase';

/**
 * Active subscriptions registry
 * Stores all active channel subscriptions for cleanup
 */
const activeSubscriptions = new Map();

/**
 * Reconnection configuration
 */
const RECONNECT_CONFIG = {
  maxRetries: 5,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
};

/**
 * Subscription state tracker
 */
const subscriptionStates = new Map();

/**
 * Subscribe to new cases (INSERT events)
 * @param {Function} onNewCase - Callback for new case events
 * @param {Function} onError - Callback for errors
 * @param {Object} options - Subscription options
 * @param {string} options.status - Filter by status (optional)
 * @param {string} options.urgencyLevel - Filter by urgency level (optional)
 * @returns {Object} Subscription object with unsubscribe method
 */
export const subscribeToNewCases = (onNewCase, onError, options = {}) => {
  const channelName = 'new-cases';
  
  try {
    // Check if already subscribed
    if (activeSubscriptions.has(channelName)) {
      console.log('Already subscribed to new cases');
      return activeSubscriptions.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cases',
        },
        async (payload) => {
          try {
            // Fetch full case details with reporter info
            const { data, error } = await supabase
              .from('cases')
              .select(`
                *,
                reporter:profiles!reporter_id(id, name, phone, user_type, email)
              `)
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Error fetching new case details:', error);
              if (onError) onError(error);
              return;
            }

            // Apply client-side filters if specified
            if (options.status && data.status !== options.status) {
              return;
            }

            if (options.urgencyLevel && data.urgency_level !== options.urgencyLevel) {
              return;
            }

            if (onNewCase) {
              onNewCase(data);
            }
          } catch (err) {
            console.error('Error processing new case:', err);
            if (onError) onError(err);
          }
        }
      )
      .subscribe((status, err) => {
        handleSubscriptionStatus(channelName, status, err, onError);
      });

    const subscription = {
      channel,
      channelName,
      unsubscribe: async () => {
        await unsubscribeChannel(channelName);
      },
    };

    activeSubscriptions.set(channelName, subscription);
    subscriptionStates.set(channelName, { status: 'connecting', retries: 0 });

    return subscription;
  } catch (error) {
    console.error('Subscribe to new cases exception:', error);
    if (onError) onError(error);
    return {
      unsubscribe: () => {},
    };
  }
};

/**
 * Subscribe to case status updates (UPDATE events)
 * @param {string} caseId - Case ID to monitor (optional, monitors all if not provided)
 * @param {Function} onStatusUpdate - Callback for status update events
 * @param {Function} onError - Callback for errors
 * @returns {Object} Subscription object with unsubscribe method
 */
export const subscribeToCaseUpdates = (caseId, onStatusUpdate, onError) => {
  const channelName = caseId ? `case-updates:${caseId}` : 'case-updates:all';
  
  try {
    // Check if already subscribed
    if (activeSubscriptions.has(channelName)) {
      console.log(`Already subscribed to case updates: ${channelName}`);
      return activeSubscriptions.get(channelName);
    }

    let channel = supabase.channel(channelName);

    // Configure postgres_changes event
    const changeConfig = {
      event: 'UPDATE',
      schema: 'public',
      table: 'cases',
    };

    // Add filter if specific case ID provided
    if (caseId) {
      changeConfig.filter = `id=eq.${caseId}`;
    }

    channel = channel.on(
      'postgres_changes',
      changeConfig,
      async (payload) => {
        try {
          // Fetch full case details
          const { data, error } = await supabase
            .from('cases')
            .select(`
              *,
              reporter:profiles!reporter_id(id, name, phone, user_type, email)
            `)
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('Error fetching updated case details:', error);
            if (onError) onError(error);
            return;
          }

          if (onStatusUpdate) {
            onStatusUpdate({
              old: payload.old,
              new: data,
              changes: getChangedFields(payload.old, payload.new),
            });
          }
        } catch (err) {
          console.error('Error processing case update:', err);
          if (onError) onError(err);
        }
      }
    );

    channel = channel.subscribe((status, err) => {
      handleSubscriptionStatus(channelName, status, err, onError);
    });

    const subscription = {
      channel,
      channelName,
      caseId,
      unsubscribe: async () => {
        await unsubscribeChannel(channelName);
      },
    };

    activeSubscriptions.set(channelName, subscription);
    subscriptionStates.set(channelName, { status: 'connecting', retries: 0 });

    return subscription;
  } catch (error) {
    console.error('Subscribe to case updates exception:', error);
    if (onError) onError(error);
    return {
      unsubscribe: () => {},
    };
  }
};

/**
 * Subscribe to status updates table for a case
 * @param {string} caseId - Case ID
 * @param {Function} onStatusUpdate - Callback for new status updates
 * @param {Function} onError - Callback for errors
 * @returns {Object} Subscription object with unsubscribe method
 */
export const subscribeToStatusUpdates = (caseId, onStatusUpdate, onError) => {
  const channelName = `status-updates:${caseId}`;
  
  try {
    // Check if already subscribed
    if (activeSubscriptions.has(channelName)) {
      console.log(`Already subscribed to status updates: ${channelName}`);
      return activeSubscriptions.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'status_updates',
          filter: `case_id=eq.${caseId}`,
        },
        async (payload) => {
          try {
            // Fetch full status update with user details
            const { data, error } = await supabase
              .from('status_updates')
              .select(`
                *,
                updated_by:profiles!updated_by(id, name, user_type, verification)
              `)
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Error fetching status update details:', error);
              if (onError) onError(error);
              return;
            }

            if (onStatusUpdate) {
              onStatusUpdate(data);
            }
          } catch (err) {
            console.error('Error processing status update:', err);
            if (onError) onError(err);
          }
        }
      )
      .subscribe((status, err) => {
        handleSubscriptionStatus(channelName, status, err, onError);
      });

    const subscription = {
      channel,
      channelName,
      caseId,
      unsubscribe: async () => {
        await unsubscribeChannel(channelName);
      },
    };

    activeSubscriptions.set(channelName, subscription);
    subscriptionStates.set(channelName, { status: 'connecting', retries: 0 });

    return subscription;
  } catch (error) {
    console.error('Subscribe to status updates exception:', error);
    if (onError) onError(error);
    return {
      unsubscribe: () => {},
    };
  }
};

/**
 * Subscribe to messages for a case
 * @param {string} caseId - Case ID
 * @param {Function} onMessage - Callback for new messages
 * @param {Function} onError - Callback for errors
 * @returns {Object} Subscription object with unsubscribe method
 */
export const subscribeToMessages = (caseId, onMessage, onError) => {
  const channelName = `messages:${caseId}`;
  
  try {
    // Check if already subscribed
    if (activeSubscriptions.has(channelName)) {
      console.log(`Already subscribed to messages: ${channelName}`);
      return activeSubscriptions.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `case_id=eq.${caseId}`,
        },
        async (payload) => {
          try {
            // Fetch full message with sender details
            const { data, error } = await supabase
              .from('messages')
              .select(`
                *,
                sender:profiles!sender_id(id, name, user_type, verification)
              `)
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Error fetching message details:', error);
              if (onError) onError(error);
              return;
            }

            if (onMessage) {
              onMessage(data);
            }
          } catch (err) {
            console.error('Error processing message:', err);
            if (onError) onError(err);
          }
        }
      )
      .subscribe((status, err) => {
        handleSubscriptionStatus(channelName, status, err, onError);
      });

    const subscription = {
      channel,
      channelName,
      caseId,
      unsubscribe: async () => {
        await unsubscribeChannel(channelName);
      },
    };

    activeSubscriptions.set(channelName, subscription);
    subscriptionStates.set(channelName, { status: 'connecting', retries: 0 });

    return subscription;
  } catch (error) {
    console.error('Subscribe to messages exception:', error);
    if (onError) onError(error);
    return {
      unsubscribe: () => {},
    };
  }
};

/**
 * Subscribe to presence channel for online helper tracking
 * @param {string} caseId - Case ID
 * @param {string} userId - Current user ID
 * @param {Object} userInfo - User information to broadcast
 * @param {Function} onPresenceChange - Callback for presence changes
 * @param {Function} onError - Callback for errors
 * @returns {Object} Subscription object with unsubscribe and track methods
 */
export const subscribeToPresence = async (caseId, userId, userInfo, onPresenceChange, onError) => {
  const channelName = `presence:${caseId}`;
  
  try {
    // Check if already subscribed
    if (activeSubscriptions.has(channelName)) {
      console.log(`Already subscribed to presence: ${channelName}`);
      return activeSubscriptions.get(channelName);
    }

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Handle presence sync (full state)
    channel.on('presence', { event: 'sync' }, () => {
      try {
        const state = channel.presenceState();
        const onlineUsers = [];
        
        // Extract user data from presence state
        Object.keys(state).forEach(key => {
          if (state[key] && state[key].length > 0) {
            onlineUsers.push(state[key][0]);
          }
        });

        if (onPresenceChange) {
          onPresenceChange({
            type: 'sync',
            onlineUsers,
            count: onlineUsers.length,
          });
        }
      } catch (err) {
        console.error('Error processing presence sync:', err);
        if (onError) onError(err);
      }
    });

    // Handle user joining
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      try {
        if (onPresenceChange && newPresences && newPresences.length > 0) {
          onPresenceChange({
            type: 'join',
            user: newPresences[0],
            userId: key,
          });
        }
      } catch (err) {
        console.error('Error processing presence join:', err);
        if (onError) onError(err);
      }
    });

    // Handle user leaving
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      try {
        if (onPresenceChange && leftPresences && leftPresences.length > 0) {
          onPresenceChange({
            type: 'leave',
            user: leftPresences[0],
            userId: key,
          });
        }
      } catch (err) {
        console.error('Error processing presence leave:', err);
        if (onError) onError(err);
      }
    });

    // Subscribe to channel
    await new Promise((resolve, reject) => {
      channel.subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          // Track current user's presence
          try {
            await channel.track({
              user_id: userId,
              name: userInfo.name || 'Unknown',
              user_type: userInfo.user_type || 'reporter',
              online_at: new Date().toISOString(),
              ...userInfo,
            });
            resolve();
          } catch (trackErr) {
            console.error('Error tracking presence:', trackErr);
            if (onError) onError(trackErr);
            reject(trackErr);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const error = new Error(`Presence subscription ${status}`);
          if (onError) onError(error);
          reject(error);
        }
      });
    });

    const subscription = {
      channel,
      channelName,
      caseId,
      userId,
      track: async (updatedInfo) => {
        try {
          await channel.track({
            user_id: userId,
            name: updatedInfo.name || userInfo.name || 'Unknown',
            user_type: updatedInfo.user_type || userInfo.user_type || 'reporter',
            online_at: new Date().toISOString(),
            ...updatedInfo,
          });
        } catch (err) {
          console.error('Error updating presence:', err);
          if (onError) onError(err);
        }
      },
      unsubscribe: async () => {
        try {
          await channel.untrack();
        } catch (err) {
          console.error('Error untracking presence:', err);
        }
        await unsubscribeChannel(channelName);
      },
    };

    activeSubscriptions.set(channelName, subscription);
    subscriptionStates.set(channelName, { status: 'subscribed', retries: 0 });

    return subscription;
  } catch (error) {
    console.error('Subscribe to presence exception:', error);
    if (onError) onError(error);
    return {
      track: () => {},
      unsubscribe: () => {},
    };
  }
};

/**
 * Subscribe to case assignments for a helper
 * @param {string} helperId - Helper user ID
 * @param {Function} onAssignment - Callback for new assignments
 * @param {Function} onError - Callback for errors
 * @returns {Object} Subscription object with unsubscribe method
 */
export const subscribeToAssignments = (helperId, onAssignment, onError) => {
  const channelName = `assignments:${helperId}`;
  
  try {
    // Check if already subscribed
    if (activeSubscriptions.has(channelName)) {
      console.log(`Already subscribed to assignments: ${channelName}`);
      return activeSubscriptions.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'case_assignments',
          filter: `helper_id=eq.${helperId}`,
        },
        async (payload) => {
          try {
            // Fetch full assignment with case details
            const { data, error } = await supabase
              .from('case_assignments')
              .select(`
                *,
                case:cases(
                  *,
                  reporter:profiles!reporter_id(id, name, phone, user_type, email)
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Error fetching assignment details:', error);
              if (onError) onError(error);
              return;
            }

            if (onAssignment) {
              onAssignment(data);
            }
          } catch (err) {
            console.error('Error processing assignment:', err);
            if (onError) onError(err);
          }
        }
      )
      .subscribe((status, err) => {
        handleSubscriptionStatus(channelName, status, err, onError);
      });

    const subscription = {
      channel,
      channelName,
      helperId,
      unsubscribe: async () => {
        await unsubscribeChannel(channelName);
      },
    };

    activeSubscriptions.set(channelName, subscription);
    subscriptionStates.set(channelName, { status: 'connecting', retries: 0 });

    return subscription;
  } catch (error) {
    console.error('Subscribe to assignments exception:', error);
    if (onError) onError(error);
    return {
      unsubscribe: () => {},
    };
  }
};

/**
 * Handle subscription status changes
 * @param {string} channelName - Channel name
 * @param {string} status - Subscription status
 * @param {Error} error - Error object if any
 * @param {Function} onError - Error callback
 */
const handleSubscriptionStatus = (channelName, status, error, onError) => {
  const state = subscriptionStates.get(channelName) || { retries: 0 };

  switch (status) {
    case 'SUBSCRIBED':
      console.log(`✓ Subscribed to ${channelName}`);
      subscriptionStates.set(channelName, { status: 'subscribed', retries: 0 });
      break;

    case 'CHANNEL_ERROR':
      console.error(`✗ Channel error for ${channelName}:`, error);
      subscriptionStates.set(channelName, { status: 'error', retries: state.retries });
      if (onError) onError(error || new Error('Channel error'));
      
      // Attempt reconnection
      attemptReconnection(channelName, state.retries);
      break;

    case 'TIMED_OUT':
      console.error(`✗ Channel timeout for ${channelName}`);
      subscriptionStates.set(channelName, { status: 'timeout', retries: state.retries });
      if (onError) onError(new Error('Channel timeout'));
      
      // Attempt reconnection
      attemptReconnection(channelName, state.retries);
      break;

    case 'CLOSED':
      console.log(`Channel closed: ${channelName}`);
      subscriptionStates.set(channelName, { status: 'closed', retries: state.retries });
      break;

    default:
      console.log(`Channel status for ${channelName}: ${status}`);
  }
};

/**
 * Attempt to reconnect a failed subscription
 * @param {string} channelName - Channel name
 * @param {number} currentRetries - Current retry count
 */
const attemptReconnection = (channelName, currentRetries) => {
  if (currentRetries >= RECONNECT_CONFIG.maxRetries) {
    console.error(`Max reconnection attempts reached for ${channelName}`);
    return;
  }

  const delay = Math.min(
    RECONNECT_CONFIG.initialDelay * Math.pow(RECONNECT_CONFIG.backoffMultiplier, currentRetries),
    RECONNECT_CONFIG.maxDelay
  );

  console.log(`Attempting to reconnect ${channelName} in ${delay}ms (attempt ${currentRetries + 1}/${RECONNECT_CONFIG.maxRetries})`);

  setTimeout(async () => {
    const subscription = activeSubscriptions.get(channelName);
    if (subscription && subscription.channel) {
      try {
        // Update retry count
        const state = subscriptionStates.get(channelName) || { retries: 0 };
        subscriptionStates.set(channelName, { ...state, retries: currentRetries + 1 });

        // Resubscribe
        await subscription.channel.subscribe();
      } catch (error) {
        console.error(`Reconnection failed for ${channelName}:`, error);
      }
    }
  }, delay);
};

/**
 * Unsubscribe from a channel
 * @param {string} channelName - Channel name
 */
const unsubscribeChannel = async (channelName) => {
  try {
    const subscription = activeSubscriptions.get(channelName);
    if (subscription && subscription.channel) {
      await supabase.removeChannel(subscription.channel);
      activeSubscriptions.delete(channelName);
      subscriptionStates.delete(channelName);
      console.log(`Unsubscribed from ${channelName}`);
    }
  } catch (error) {
    console.error(`Error unsubscribing from ${channelName}:`, error);
  }
};

/**
 * Unsubscribe from all active channels
 */
export const unsubscribeAll = async () => {
  try {
    const channelNames = Array.from(activeSubscriptions.keys());
    console.log(`Unsubscribing from ${channelNames.length} channels...`);

    for (const channelName of channelNames) {
      await unsubscribeChannel(channelName);
    }

    console.log('All subscriptions cleaned up');
  } catch (error) {
    console.error('Error unsubscribing all:', error);
  }
};

/**
 * Get active subscription count
 * @returns {number} Number of active subscriptions
 */
export const getActiveSubscriptionCount = () => {
  return activeSubscriptions.size;
};

/**
 * Get subscription state
 * @param {string} channelName - Channel name
 * @returns {Object|null} Subscription state
 */
export const getSubscriptionState = (channelName) => {
  return subscriptionStates.get(channelName) || null;
};

/**
 * Get all active subscription names
 * @returns {Array<string>} Array of channel names
 */
export const getActiveSubscriptions = () => {
  return Array.from(activeSubscriptions.keys());
};

/**
 * Helper function to get changed fields between old and new objects
 * @param {Object} oldObj - Old object
 * @param {Object} newObj - New object
 * @returns {Array<string>} Array of changed field names
 */
const getChangedFields = (oldObj, newObj) => {
  const changes = [];
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
  
  allKeys.forEach(key => {
    if (oldObj[key] !== newObj[key]) {
      changes.push(key);
    }
  });
  
  return changes;
};

export default {
  subscribeToNewCases,
  subscribeToCaseUpdates,
  subscribeToStatusUpdates,
  subscribeToMessages,
  subscribeToPresence,
  subscribeToAssignments,
  unsubscribeAll,
  getActiveSubscriptionCount,
  getSubscriptionState,
  getActiveSubscriptions,
};
