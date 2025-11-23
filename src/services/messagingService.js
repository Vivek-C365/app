/**
 * @fileoverview Messaging Service using Supabase Realtime
 * Handles real-time messaging with live subscriptions, read receipts, and presence tracking
 */
import { supabase } from '../config/supabase';

/**
 * Get messages for a case
 * @param {string} caseId - Case ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of messages to fetch
 * @param {number} options.offset - Offset for pagination
 * @returns {Promise<Object>} Messages result
 */
export const getMessages = async (caseId, options = {}) => {
  try {
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(id, name, user_type, verification)
      `)
      .eq('case_id', caseId)
      .order('timestamp', { ascending: true });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get messages error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messages: data || [],
    };
  } catch (error) {
    console.error('Get messages exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch messages',
    };
  }
};

/**
 * Send a message to a case
 * @param {string} caseId - Case ID
 * @param {Object} messageData - Message data
 * @param {string} messageData.content - Message content
 * @param {string} messageData.messageType - Message type (text, status_update, system)
 * @param {string} messageData.priority - Message priority (normal, urgent)
 * @returns {Promise<Object>} Send result
 */
export const sendMessage = async (caseId, messageData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        case_id: caseId,
        sender_id: user.id,
        content: messageData.content,
        message_type: messageData.messageType || 'text',
        priority: messageData.priority || 'normal',
      }])
      .select(`
        *,
        sender:profiles!sender_id(id, name, user_type, verification)
      `)
      .single();

    if (error) {
      console.error('Send message error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: data,
    };
  } catch (error) {
    console.error('Send message exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to send message',
    };
  }
};

/**
 * Subscribe to real-time messages for a case
 * @param {string} caseId - Case ID
 * @param {Function} onMessage - Callback for new messages
 * @param {Function} onError - Callback for errors
 * @returns {Object} Subscription object with unsubscribe method
 */
export const subscribeToMessages = (caseId, onMessage, onError) => {
  try {
    const channel = supabase
      .channel(`case:${caseId}:messages`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `case_id=eq.${caseId}`,
        },
        async (payload) => {
          // Fetch full message with sender details
          const { data, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!sender_id(id, name, user_type, verification)
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            onMessage(data);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to messages for case:', caseId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error for case:', caseId);
          if (onError) onError(new Error('Channel subscription error'));
        } else if (status === 'TIMED_OUT') {
          console.error('Channel timeout for case:', caseId);
          if (onError) onError(new Error('Channel subscription timeout'));
        }
      });

    return {
      unsubscribe: async () => {
        await supabase.removeChannel(channel);
      },
    };
  } catch (error) {
    console.error('Subscribe to messages exception:', error);
    if (onError) onError(error);
    return {
      unsubscribe: () => {},
    };
  }
};

/**
 * Mark messages as read
 * @param {string} messageId - Message ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Update result
 */
export const markMessageAsRead = async (messageId, userId) => {
  try {
    // Get current message
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('read_by')
      .eq('id', messageId)
      .maybeSingle();

    if (fetchError) {
      console.error('Fetch message error:', fetchError);
      return {
        success: false,
        error: fetchError.message,
      };
    }

    // If message doesn't exist, return success (it might have been deleted)
    if (!message) {
      console.warn('Message not found, skipping mark as read:', messageId);
      return {
        success: true,
        message: null,
      };
    }

    // Add user to read_by array if not already present
    const readBy = message.read_by || [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);

      const { data, error } = await supabase
        .from('messages')
        .update({ read_by: readBy })
        .eq('id', messageId)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Mark as read error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        message: data,
      };
    }

    return {
      success: true,
      message,
    };
  } catch (error) {
    console.error('Mark message as read exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to mark message as read',
    };
  }
};

/**
 * Get unread message count for a case
 * @param {string} caseId - Case ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Unread count result
 */
export const getUnreadCount = async (caseId, userId) => {
  try {
    const { data, error, count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('case_id', caseId)
      .not('read_by', 'cs', `{${userId}}`);

    if (error) {
      console.error('Get unread count error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      count: count || 0,
    };
  } catch (error) {
    console.error('Get unread count exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to get unread count',
    };
  }
};

/**
 * Upload image for chat using Cloudinary
 * @param {string} imageUri - Local image URI
 * @param {string} caseId - Case ID
 * @returns {Promise<Object>} Upload result
 */
export const uploadChatImage = async (imageUri, caseId) => {
  try {
    const { uploadToCloudinary } = require('./uploadService');
    
    // Upload to Cloudinary with progress tracking
    const result = await uploadToCloudinary(imageUri, (progress) => {
      console.log(`Upload progress: ${progress}%`);
    });

    return {
      success: true,
      url: result.url,
      publicId: result.publicId,
      thumbnailUrl: result.thumbnailUrl,
    };
  } catch (error) {
    console.error('Upload chat image exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload image',
    };
  }
};

/**
 * Subscribe to presence (online users) for a case
 * @param {string} caseId - Case ID
 * @param {string} userId - Current user ID
 * @param {Object} userInfo - User information
 * @param {Function} onPresenceChange - Callback for presence changes
 * @returns {Object} Presence subscription object
 */
export const subscribeToPresence = async (caseId, userId, userInfo, onPresenceChange) => {
  try {
    const channel = supabase.channel(`case:${caseId}:presence`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineUsers = Object.keys(state).map(key => state[key][0]);
        if (onPresenceChange) {
          onPresenceChange(onlineUsers);
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track current user's presence
          await channel.track({
            user_id: userId,
            name: userInfo.name,
            user_type: userInfo.user_type,
            online_at: new Date().toISOString(),
          });
        }
      });

    return {
      unsubscribe: async () => {
        await channel.untrack();
        await supabase.removeChannel(channel);
      },
    };
  } catch (error) {
    console.error('Subscribe to presence exception:', error);
    return {
      unsubscribe: () => {},
    };
  }
};

/**
 * Delete a message (soft delete by marking as deleted)
 * @param {string} messageId - Message ID
 * @returns {Promise<Object>} Delete result
 */
export const deleteMessage = async (messageId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({ content: '[Message deleted]', message_type: 'system' })
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      console.error('Delete message error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: data,
    };
  } catch (error) {
    console.error('Delete message exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete message',
    };
  }
};

export default {
  getMessages,
  sendMessage,
  subscribeToMessages,
  markMessageAsRead,
  getUnreadCount,
  uploadChatImage,
  subscribeToPresence,
  deleteMessage,
};
