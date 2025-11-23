/**
 * @fileoverview Offline Service
 * Handles offline data storage, mutation queue, and synchronization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../config/supabase';

// Storage keys
const OFFLINE_QUEUE_KEY = '@offline_queue';
const OFFLINE_DRAFTS_KEY = '@offline_drafts';
const OFFLINE_CASES_KEY = '@offline_cases';
const OFFLINE_PROFILES_KEY = '@offline_profiles';
const OFFLINE_MESSAGES_KEY = '@offline_messages';
const NETWORK_STATUS_KEY = '@network_status';

/**
 * Network status listener
 */
let networkUnsubscribe = null;
let isOnline = true;
let networkListeners = [];

/**
 * Initialize offline service
 */
export const initializeOfflineService = () => {
  // Subscribe to network status changes
  networkUnsubscribe = NetInfo.addEventListener(state => {
    const wasOnline = isOnline;
    isOnline = state.isConnected && state.isInternetReachable !== false;
    
    console.log('Network status changed:', {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      isOnline,
    });
    
    // Notify listeners
    networkListeners.forEach(listener => listener(isOnline));
    
    // Auto-sync when coming back online
    if (!wasOnline && isOnline) {
      console.log('Network restored, starting auto-sync...');
      syncOfflineData().catch(error => {
        console.error('Auto-sync failed:', error);
      });
    }
  });
  
  // Get initial network status
  NetInfo.fetch().then(state => {
    isOnline = state.isConnected && state.isInternetReachable !== false;
    console.log('Initial network status:', isOnline);
  });
};

/**
 * Cleanup offline service
 */
export const cleanupOfflineService = () => {
  if (networkUnsubscribe) {
    networkUnsubscribe();
    networkUnsubscribe = null;
  }
  networkListeners = [];
};

/**
 * Add network status listener
 * @param {Function} listener - Callback function (isOnline) => void
 * @returns {Function} Unsubscribe function
 */
export const addNetworkListener = (listener) => {
  networkListeners.push(listener);
  // Immediately call with current status
  listener(isOnline);
  
  return () => {
    networkListeners = networkListeners.filter(l => l !== listener);
  };
};

/**
 * Get current network status
 * @returns {boolean} True if online
 */
export const getNetworkStatus = () => {
  return isOnline;
};

/**
 * Check network status (async)
 * @returns {Promise<boolean>} True if online
 */
export const checkNetworkStatus = async () => {
  try {
    const state = await NetInfo.fetch();
    isOnline = state.isConnected && state.isInternetReachable !== false;
    return isOnline;
  } catch (error) {
    console.error('Error checking network status:', error);
    return false;
  }
};

// ============================================================================
// MUTATION QUEUE
// ============================================================================

/**
 * Add mutation to offline queue
 * @param {Object} mutation - Mutation object
 * @param {string} mutation.type - Mutation type (insert, update, delete)
 * @param {string} mutation.table - Table name
 * @param {Object} mutation.data - Data to mutate
 * @param {Object} mutation.filter - Filter for update/delete operations
 * @param {string} mutation.id - Unique mutation ID
 * @returns {Promise<boolean>} Success status
 */
export const queueMutation = async (mutation) => {
  try {
    const queue = await getMutationQueue();
    
    // Add timestamp and ID if not present
    const mutationWithMeta = {
      ...mutation,
      id: mutation.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: mutation.timestamp || Date.now(),
      retryCount: mutation.retryCount || 0,
    };
    
    queue.push(mutationWithMeta);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    
    console.log('Mutation queued:', mutationWithMeta.id);
    return true;
  } catch (error) {
    console.error('Error queuing mutation:', error);
    return false;
  }
};

/**
 * Get mutation queue
 * @returns {Promise<Array>} Array of mutations
 */
export const getMutationQueue = async () => {
  try {
    const queueData = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return queueData ? JSON.parse(queueData) : [];
  } catch (error) {
    console.error('Error getting mutation queue:', error);
    return [];
  }
};

/**
 * Clear mutation queue
 * @returns {Promise<boolean>} Success status
 */
export const clearMutationQueue = async () => {
  try {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing mutation queue:', error);
    return false;
  }
};

/**
 * Remove specific mutation from queue
 * @param {string} mutationId - Mutation ID
 * @returns {Promise<boolean>} Success status
 */
export const removeMutation = async (mutationId) => {
  try {
    const queue = await getMutationQueue();
    const filteredQueue = queue.filter(m => m.id !== mutationId);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filteredQueue));
    return true;
  } catch (error) {
    console.error('Error removing mutation:', error);
    return false;
  }
};

/**
 * Execute a single mutation
 * @param {Object} mutation - Mutation object
 * @returns {Promise<Object>} Result object
 */
const executeMutation = async (mutation) => {
  try {
    const { type, table, data, filter } = mutation;
    
    switch (type) {
      case 'insert': {
        const { data: result, error } = await supabase
          .from(table)
          .insert(data)
          .select()
          .single();
        
        if (error) throw error;
        return { success: true, data: result };
      }
      
      case 'update': {
        let query = supabase.from(table).update(data);
        
        // Apply filters
        if (filter) {
          Object.entries(filter).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }
        
        const { data: result, error } = await query.select();
        
        if (error) throw error;
        return { success: true, data: result };
      }
      
      case 'delete': {
        let query = supabase.from(table).delete();
        
        // Apply filters
        if (filter) {
          Object.entries(filter).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }
        
        const { error } = await query;
        
        if (error) throw error;
        return { success: true };
      }
      
      case 'rpc': {
        const { data: result, error } = await supabase.rpc(
          mutation.function,
          mutation.params
        );
        
        if (error) throw error;
        return { success: true, data: result };
      }
      
      case 'storage_upload': {
        const { bucket, path, file } = mutation;
        const { data: result, error } = await supabase.storage
          .from(bucket)
          .upload(path, file, mutation.options || {});
        
        if (error) throw error;
        return { success: true, data: result };
      }
      
      default:
        throw new Error(`Unknown mutation type: ${type}`);
    }
  } catch (error) {
    console.error('Error executing mutation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sync offline data (execute queued mutations)
 * @returns {Promise<Object>} Sync result
 */
export const syncOfflineData = async () => {
  try {
    // Check if online
    const online = await checkNetworkStatus();
    if (!online) {
      return {
        success: false,
        error: 'No network connection',
      };
    }
    
    const queue = await getMutationQueue();
    
    if (queue.length === 0) {
      return {
        success: true,
        synced: 0,
        failed: 0,
      };
    }
    
    console.log(`Syncing ${queue.length} mutations...`);
    
    const results = {
      synced: 0,
      failed: 0,
      errors: [],
    };
    
    // Execute mutations in order
    for (const mutation of queue) {
      const result = await executeMutation(mutation);
      
      if (result.success) {
        results.synced++;
        await removeMutation(mutation.id);
        console.log(`Synced mutation ${mutation.id}`);
      } else {
        results.failed++;
        results.errors.push({
          mutationId: mutation.id,
          error: result.error,
        });
        
        // Update retry count
        mutation.retryCount = (mutation.retryCount || 0) + 1;
        
        // Remove if max retries reached
        if (mutation.retryCount >= 3) {
          console.warn(`Mutation ${mutation.id} failed after 3 retries, removing`);
          await removeMutation(mutation.id);
        }
      }
    }
    
    console.log('Sync complete:', results);
    
    return {
      success: true,
      ...results,
    };
  } catch (error) {
    console.error('Sync exception:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// ============================================================================
// DRAFT MANAGEMENT
// ============================================================================

/**
 * Save draft report
 * @param {Object} draft - Draft data
 * @param {string} draftId - Optional draft ID (generates if not provided)
 * @returns {Promise<Object>} Result with draft ID
 */
export const saveDraft = async (draft, draftId = null) => {
  try {
    const id = draftId || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const drafts = await getDrafts();
    
    const draftWithMeta = {
      ...draft,
      id,
      savedAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    // Update existing or add new
    const existingIndex = drafts.findIndex(d => d.id === id);
    if (existingIndex >= 0) {
      drafts[existingIndex] = draftWithMeta;
    } else {
      drafts.push(draftWithMeta);
    }
    
    await AsyncStorage.setItem(OFFLINE_DRAFTS_KEY, JSON.stringify(drafts));
    
    console.log('Draft saved:', id);
    return { success: true, draftId: id };
  } catch (error) {
    console.error('Error saving draft:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all drafts
 * @returns {Promise<Array>} Array of drafts
 */
export const getDrafts = async () => {
  try {
    const draftsData = await AsyncStorage.getItem(OFFLINE_DRAFTS_KEY);
    return draftsData ? JSON.parse(draftsData) : [];
  } catch (error) {
    console.error('Error getting drafts:', error);
    return [];
  }
};

/**
 * Get draft by ID
 * @param {string} draftId - Draft ID
 * @returns {Promise<Object|null>} Draft or null
 */
export const getDraft = async (draftId) => {
  try {
    const drafts = await getDrafts();
    return drafts.find(d => d.id === draftId) || null;
  } catch (error) {
    console.error('Error getting draft:', error);
    return null;
  }
};

/**
 * Delete draft
 * @param {string} draftId - Draft ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteDraft = async (draftId) => {
  try {
    const drafts = await getDrafts();
    const filteredDrafts = drafts.filter(d => d.id !== draftId);
    await AsyncStorage.setItem(OFFLINE_DRAFTS_KEY, JSON.stringify(filteredDrafts));
    console.log('Draft deleted:', draftId);
    return true;
  } catch (error) {
    console.error('Error deleting draft:', error);
    return false;
  }
};

/**
 * Clear all drafts
 * @returns {Promise<boolean>} Success status
 */
export const clearAllDrafts = async () => {
  try {
    await AsyncStorage.removeItem(OFFLINE_DRAFTS_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing drafts:', error);
    return false;
  }
};

// ============================================================================
// DATA CACHING
// ============================================================================

/**
 * Cache cases for offline viewing
 * @param {Array} cases - Array of cases
 * @returns {Promise<boolean>} Success status
 */
export const cacheCases = async (cases) => {
  try {
    const cacheData = {
      cases,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(OFFLINE_CASES_KEY, JSON.stringify(cacheData));
    console.log(`Cached ${cases.length} cases`);
    return true;
  } catch (error) {
    console.error('Error caching cases:', error);
    return false;
  }
};

/**
 * Get cached cases
 * @param {number} maxAgeMinutes - Maximum cache age in minutes (default: 60)
 * @returns {Promise<Array|null>} Cached cases or null if expired
 */
export const getCachedCases = async (maxAgeMinutes = 60) => {
  try {
    const cacheData = await AsyncStorage.getItem(OFFLINE_CASES_KEY);
    if (!cacheData) return null;
    
    const { cases, cachedAt } = JSON.parse(cacheData);
    
    // Check if cache is still valid
    const ageMinutes = (Date.now() - cachedAt) / (60 * 1000);
    if (ageMinutes > maxAgeMinutes) {
      console.log('Case cache expired');
      return null;
    }
    
    console.log(`Retrieved ${cases.length} cached cases (age: ${Math.round(ageMinutes)}m)`);
    return cases;
  } catch (error) {
    console.error('Error getting cached cases:', error);
    return null;
  }
};

/**
 * Cache profiles for offline viewing
 * @param {Array} profiles - Array of profiles
 * @returns {Promise<boolean>} Success status
 */
export const cacheProfiles = async (profiles) => {
  try {
    const cacheData = {
      profiles,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(OFFLINE_PROFILES_KEY, JSON.stringify(cacheData));
    console.log(`Cached ${profiles.length} profiles`);
    return true;
  } catch (error) {
    console.error('Error caching profiles:', error);
    return false;
  }
};

/**
 * Get cached profiles
 * @param {number} maxAgeMinutes - Maximum cache age in minutes (default: 60)
 * @returns {Promise<Array|null>} Cached profiles or null if expired
 */
export const getCachedProfiles = async (maxAgeMinutes = 60) => {
  try {
    const cacheData = await AsyncStorage.getItem(OFFLINE_PROFILES_KEY);
    if (!cacheData) return null;
    
    const { profiles, cachedAt } = JSON.parse(cacheData);
    
    // Check if cache is still valid
    const ageMinutes = (Date.now() - cachedAt) / (60 * 1000);
    if (ageMinutes > maxAgeMinutes) {
      console.log('Profile cache expired');
      return null;
    }
    
    console.log(`Retrieved ${profiles.length} cached profiles (age: ${Math.round(ageMinutes)}m)`);
    return profiles;
  } catch (error) {
    console.error('Error getting cached profiles:', error);
    return null;
  }
};

/**
 * Cache messages for a case
 * @param {string} caseId - Case ID
 * @param {Array} messages - Array of messages
 * @returns {Promise<boolean>} Success status
 */
export const cacheMessages = async (caseId, messages) => {
  try {
    const allMessages = await AsyncStorage.getItem(OFFLINE_MESSAGES_KEY);
    const messageCache = allMessages ? JSON.parse(allMessages) : {};
    
    messageCache[caseId] = {
      messages,
      cachedAt: Date.now(),
    };
    
    await AsyncStorage.setItem(OFFLINE_MESSAGES_KEY, JSON.stringify(messageCache));
    console.log(`Cached ${messages.length} messages for case ${caseId}`);
    return true;
  } catch (error) {
    console.error('Error caching messages:', error);
    return false;
  }
};

/**
 * Get cached messages for a case
 * @param {string} caseId - Case ID
 * @param {number} maxAgeMinutes - Maximum cache age in minutes (default: 30)
 * @returns {Promise<Array|null>} Cached messages or null if expired
 */
export const getCachedMessages = async (caseId, maxAgeMinutes = 30) => {
  try {
    const allMessages = await AsyncStorage.getItem(OFFLINE_MESSAGES_KEY);
    if (!allMessages) return null;
    
    const messageCache = JSON.parse(allMessages);
    const caseMessages = messageCache[caseId];
    
    if (!caseMessages) return null;
    
    const { messages, cachedAt } = caseMessages;
    
    // Check if cache is still valid
    const ageMinutes = (Date.now() - cachedAt) / (60 * 1000);
    if (ageMinutes > maxAgeMinutes) {
      console.log(`Message cache expired for case ${caseId}`);
      return null;
    }
    
    console.log(`Retrieved ${messages.length} cached messages for case ${caseId}`);
    return messages;
  } catch (error) {
    console.error('Error getting cached messages:', error);
    return null;
  }
};

/**
 * Clear all cached data
 * @returns {Promise<boolean>} Success status
 */
export const clearAllCache = async () => {
  try {
    await AsyncStorage.multiRemove([
      OFFLINE_CASES_KEY,
      OFFLINE_PROFILES_KEY,
      OFFLINE_MESSAGES_KEY,
    ]);
    console.log('All cache cleared');
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

/**
 * Get offline storage stats
 * @returns {Promise<Object>} Storage statistics
 */
export const getOfflineStats = async () => {
  try {
    const [queue, drafts, cases, profiles] = await Promise.all([
      getMutationQueue(),
      getDrafts(),
      getCachedCases(999999), // Get regardless of age
      getCachedProfiles(999999),
    ]);
    
    return {
      queuedMutations: queue.length,
      savedDrafts: drafts.length,
      cachedCases: cases ? cases.length : 0,
      cachedProfiles: profiles ? profiles.length : 0,
      isOnline,
    };
  } catch (error) {
    console.error('Error getting offline stats:', error);
    return {
      queuedMutations: 0,
      savedDrafts: 0,
      cachedCases: 0,
      cachedProfiles: 0,
      isOnline,
    };
  }
};

export default {
  // Initialization
  initializeOfflineService,
  cleanupOfflineService,
  
  // Network status
  addNetworkListener,
  getNetworkStatus,
  checkNetworkStatus,
  
  // Mutation queue
  queueMutation,
  getMutationQueue,
  clearMutationQueue,
  removeMutation,
  syncOfflineData,
  
  // Draft management
  saveDraft,
  getDrafts,
  getDraft,
  deleteDraft,
  clearAllDrafts,
  
  // Data caching
  cacheCases,
  getCachedCases,
  cacheProfiles,
  getCachedProfiles,
  cacheMessages,
  getCachedMessages,
  clearAllCache,
  
  // Stats
  getOfflineStats,
};
