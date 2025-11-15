/**
 * Cache Utility Functions
 * Helper functions for offline data caching using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@cache_';
const CACHE_EXPIRY_KEY = '@cache_expiry_';

/**
 * Save data to cache with optional expiry
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 * @param {number} expiryMinutes - Cache expiry in minutes (optional)
 * @returns {Promise<boolean>} Success status
 */
export const saveToCache = async (key, data, expiryMinutes = null) => {
  try {
    const cacheKey = CACHE_PREFIX + key;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    
    // Set expiry if provided
    if (expiryMinutes) {
      const expiryTime = Date.now() + (expiryMinutes * 60 * 1000);
      await AsyncStorage.setItem(CACHE_EXPIRY_KEY + key, expiryTime.toString());
    }
    
    return true;
  } catch (error) {
    console.error('Error saving to cache:', error);
    return false;
  }
};

/**
 * Get data from cache
 * @param {string} key - Cache key
 * @returns {Promise<*>} Cached data or null
 */
export const getFromCache = async (key) => {
  try {
    const cacheKey = CACHE_PREFIX + key;
    
    // Check if cache has expired
    const expiryKey = CACHE_EXPIRY_KEY + key;
    const expiryTime = await AsyncStorage.getItem(expiryKey);
    
    if (expiryTime && Date.now() > parseInt(expiryTime)) {
      // Cache expired, remove it
      await removeFromCache(key);
      return null;
    }
    
    const data = await AsyncStorage.getItem(cacheKey);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting from cache:', error);
    return null;
  }
};

/**
 * Remove data from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
export const removeFromCache = async (key) => {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const expiryKey = CACHE_EXPIRY_KEY + key;
    
    await AsyncStorage.multiRemove([cacheKey, expiryKey]);
    return true;
  } catch (error) {
    console.error('Error removing from cache:', error);
    return false;
  }
};

/**
 * Clear all cache
 * @returns {Promise<boolean>} Success status
 */
export const clearAllCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => 
      key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_EXPIRY_KEY)
    );
    
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

/**
 * Check if cache exists and is valid
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} True if cache exists and is valid
 */
export const isCacheValid = async (key) => {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const data = await AsyncStorage.getItem(cacheKey);
    
    if (!data) return false;
    
    // Check expiry
    const expiryKey = CACHE_EXPIRY_KEY + key;
    const expiryTime = await AsyncStorage.getItem(expiryKey);
    
    if (expiryTime && Date.now() > parseInt(expiryTime)) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking cache validity:', error);
    return false;
  }
};

/**
 * Get cache age in minutes
 * @param {string} key - Cache key
 * @returns {Promise<number|null>} Age in minutes or null if not cached
 */
export const getCacheAge = async (key) => {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const data = await AsyncStorage.getItem(cacheKey);
    
    if (!data) return null;
    
    // Get the timestamp when cache was created
    const expiryKey = CACHE_EXPIRY_KEY + key;
    const expiryTime = await AsyncStorage.getItem(expiryKey);
    
    if (!expiryTime) return null;
    
    const ageMs = Date.now() - (parseInt(expiryTime) - (60 * 60 * 1000)); // Assuming 60 min expiry
    return Math.floor(ageMs / (60 * 1000));
  } catch (error) {
    console.error('Error getting cache age:', error);
    return null;
  }
};
