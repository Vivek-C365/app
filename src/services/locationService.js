/**
 * Location Service
 * Handles GPS location, reverse geocoding, and location caching
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_CACHE_KEY = '@location_cache';
const LAST_LOCATION_KEY = '@last_location';

/**
 * Request location permissions from the user
 * @returns {Promise<{granted: boolean, status: string}>}
 */
export const requestLocationPermission = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return {
      granted: status === 'granted',
      status
    };
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return {
      granted: false,
      status: 'error',
      error: error.message
    };
  }
};

/**
 * Check if location permissions are granted
 * @returns {Promise<boolean>}
 */
export const checkLocationPermission = async () => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking location permission:', error);
    return false;
  }
};

/**
 * Get current GPS location
 * @param {Object} options - Location options
 * @param {number} options.accuracy - Location accuracy (default: Location.Accuracy.High)
 * @param {number} options.timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<Object>} Location object with coords
 */
export const getCurrentLocation = async (options = {}) => {
  try {
    const hasPermission = await checkLocationPermission();
    
    if (!hasPermission) {
      const permission = await requestLocationPermission();
      if (!permission.granted) {
        throw new Error('Location permission not granted');
      }
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: options.accuracy || Location.Accuracy.High,
      timeout: options.timeout || 10000,
    });

    // Cache the location for offline use
    await cacheLocation(location);

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    
    // Try to return cached location if available
    const cachedLocation = await getCachedLocation();
    if (cachedLocation) {
      return {
        ...cachedLocation,
        isCached: true,
        cacheWarning: 'Using cached location due to GPS error'
      };
    }
    
    throw error;
  }
};

/**
 * Reverse geocode coordinates to get readable address
 * Uses Expo Location's built-in reverse geocoding (no Google Maps API needed)
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<Object>} Address object
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const addresses = await Location.reverseGeocodeAsync({
      latitude,
      longitude
    });

    if (addresses && addresses.length > 0) {
      const address = addresses[0];
      
      // Format the address
      const formattedAddress = formatAddress(address);
      
      // Cache the geocoded address
      await cacheGeocodedAddress(latitude, longitude, formattedAddress);
      
      return {
        ...address,
        formattedAddress,
        coordinates: { latitude, longitude }
      };
    }

    return null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    
    // Try to get cached geocoded address
    const cached = await getCachedGeocodedAddress(latitude, longitude);
    if (cached) {
      return {
        ...cached,
        isCached: true
      };
    }
    
    throw error;
  }
};

/**
 * Format address object into readable string
 * @param {Object} address - Address object from reverse geocoding
 * @returns {string} Formatted address string
 */
const formatAddress = (address) => {
  const parts = [];
  
  if (address.name) parts.push(address.name);
  if (address.street) parts.push(address.street);
  if (address.district) parts.push(address.district);
  if (address.city) parts.push(address.city);
  if (address.region) parts.push(address.region);
  if (address.postalCode) parts.push(address.postalCode);
  if (address.country) parts.push(address.country);
  
  return parts.filter(Boolean).join(', ');
};

/**
 * Get nearby landmarks/places (simplified version without Google Places API)
 * Returns generic landmark suggestions based on address components
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<Array>} Array of landmark suggestions
 */
export const getNearbyLandmarks = async (latitude, longitude) => {
  try {
    const address = await reverseGeocode(latitude, longitude);
    
    if (!address) {
      return [];
    }

    // Generate landmark suggestions from address components
    const landmarks = [];
    
    if (address.name && address.name !== address.street) {
      landmarks.push({
        name: address.name,
        type: 'place',
        distance: 'nearby'
      });
    }
    
    if (address.street) {
      landmarks.push({
        name: address.street,
        type: 'street',
        distance: 'on this street'
      });
    }
    
    if (address.district) {
      landmarks.push({
        name: address.district,
        type: 'area',
        distance: 'in this area'
      });
    }
    
    if (address.city) {
      landmarks.push({
        name: address.city,
        type: 'city',
        distance: 'in this city'
      });
    }

    return landmarks;
  } catch (error) {
    console.error('Error getting nearby landmarks:', error);
    return [];
  }
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Cache location for offline use
 * @param {Object} location - Location object to cache
 */
const cacheLocation = async (location) => {
  try {
    const cacheData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp,
      cachedAt: Date.now()
    };
    
    await AsyncStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error caching location:', error);
  }
};

/**
 * Get cached location
 * @returns {Promise<Object|null>} Cached location or null
 */
export const getCachedLocation = async () => {
  try {
    const cached = await AsyncStorage.getItem(LAST_LOCATION_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    console.error('Error getting cached location:', error);
    return null;
  }
};

/**
 * Cache geocoded address
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {string} address - Formatted address
 */
const cacheGeocodedAddress = async (latitude, longitude, address) => {
  try {
    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const cache = await getLocationCache();
    
    cache[key] = {
      address,
      timestamp: Date.now()
    };
    
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error caching geocoded address:', error);
  }
};

/**
 * Get cached geocoded address
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<Object|null>} Cached address or null
 */
const getCachedGeocodedAddress = async (latitude, longitude) => {
  try {
    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const cache = await getLocationCache();
    
    if (cache[key]) {
      return cache[key];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached geocoded address:', error);
    return null;
  }
};

/**
 * Get location cache
 * @returns {Promise<Object>} Location cache object
 */
const getLocationCache = async () => {
  try {
    const cache = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    return cache ? JSON.parse(cache) : {};
  } catch (error) {
    console.error('Error getting location cache:', error);
    return {};
  }
};

/**
 * Clear location cache
 */
export const clearLocationCache = async () => {
  try {
    await AsyncStorage.removeItem(LOCATION_CACHE_KEY);
    await AsyncStorage.removeItem(LAST_LOCATION_KEY);
  } catch (error) {
    console.error('Error clearing location cache:', error);
  }
};

/**
 * Watch location changes (for background tracking)
 * @param {Function} callback - Callback function to receive location updates
 * @returns {Promise<Object>} Subscription object
 */
export const watchLocation = async (callback) => {
  try {
    const hasPermission = await checkLocationPermission();
    
    if (!hasPermission) {
      const permission = await requestLocationPermission();
      if (!permission.granted) {
        throw new Error('Location permission not granted');
      }
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // Update every 10 seconds
        distanceInterval: 50, // Update every 50 meters
      },
      (location) => {
        const locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          timestamp: location.timestamp,
        };
        
        // Cache the location
        cacheLocation(location);
        
        // Call the callback
        callback(locationData);
      }
    );

    return subscription;
  } catch (error) {
    console.error('Error watching location:', error);
    throw error;
  }
};
