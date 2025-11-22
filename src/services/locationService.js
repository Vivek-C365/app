/**
 * Location Service
 * Handles GPS location, reverse geocoding, and geospatial operations
 * Uses Expo Location for mobile device integration
 */

import * as Location from 'expo-location';
import { supabase } from '../config/supabase';

/**
 * Request location permissions from the user
 * @returns {Promise<boolean>} True if permission granted
 */
export const requestLocationPermission = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Get current device location
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number}>}
 */
export const getCurrentLocation = async () => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      throw new Error('Location permission not granted');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    throw error;
  }
};

/**
 * Reverse geocode coordinates to get readable address
 * Uses Expo Location's built-in reverse geocoding (no Google Maps API needed)
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Object>} Address object
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const addresses = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (addresses && addresses.length > 0) {
      const address = addresses[0];
      return {
        formattedAddress: formatAddress(address),
        street: address.street,
        city: address.city,
        region: address.region,
        postalCode: address.postalCode,
        country: address.country,
        district: address.district,
        subregion: address.subregion,
        name: address.name,
      };
    }

    return null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
};

/**
 * Format address object into readable string
 * @param {Object} address
 * @returns {string}
 */
const formatAddress = (address) => {
  const parts = [];
  
  if (address.name) parts.push(address.name);
  if (address.street) parts.push(address.street);
  if (address.district) parts.push(address.district);
  if (address.city) parts.push(address.city);
  if (address.region) parts.push(address.region);
  if (address.postalCode) parts.push(address.postalCode);
  
  return parts.filter(Boolean).join(', ');
};

/**
 * Find nearby helpers using PostGIS
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} radiusKm - Search radius in kilometers
 * @returns {Promise<Array>} Array of nearby helpers
 */
export const findNearbyHelpers = async (latitude, longitude, radiusKm = 10) => {
  try {
    const { data, error } = await supabase.rpc('find_nearby_helpers', {
      lat: latitude,
      lng: longitude,
      radius_km: radiusKm,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error finding nearby helpers:', error);
    throw error;
  }
};

/**
 * Find helpers by service area
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Array>} Array of helpers with service areas covering this location
 */
export const findHelpersByServiceArea = async (latitude, longitude) => {
  try {
    const { data, error } = await supabase.rpc('find_helpers_by_service_area', {
      lat: latitude,
      lng: longitude,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error finding helpers by service area:', error);
    throw error;
  }
};

/**
 * Calculate distance between two points
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {Promise<number>} Distance in kilometers
 */
export const calculateDistance = async (lat1, lng1, lat2, lng2) => {
  try {
    const { data, error } = await supabase.rpc('calculate_distance', {
      lat1,
      lng1,
      lat2,
      lng2,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error calculating distance:', error);
    throw error;
  }
};

/**
 * Check if a location is within a helper's service area
 * @param {string} helperId
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<boolean>}
 */
export const isWithinServiceArea = async (helperId, latitude, longitude) => {
  try {
    const { data, error } = await supabase.rpc('is_within_service_area', {
      helper_id: helperId,
      lat: latitude,
      lng: longitude,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error checking service area:', error);
    return false;
  }
};

/**
 * Update helper's current location
 * @param {string} helperId
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<boolean>}
 */
export const updateHelperLocation = async (helperId, latitude, longitude) => {
  try {
    const { data, error } = await supabase.rpc('update_helper_location', {
      p_helper_id: helperId,
      p_lat: latitude,
      p_lng: longitude,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating helper location:', error);
    throw error;
  }
};

/**
 * Get helper's service areas
 * @param {string} helperId
 * @returns {Promise<Array>}
 */
export const getHelperServiceAreas = async (helperId) => {
  try {
    const { data, error } = await supabase.rpc('get_helper_service_areas', {
      p_helper_id: helperId,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting service areas:', error);
    throw error;
  }
};

/**
 * Add or update a service area for a helper
 * @param {string} helperId
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} radiusKm
 * @param {string} city
 * @param {string} state
 * @returns {Promise<string>} Service area ID
 */
export const upsertServiceArea = async (
  helperId,
  latitude,
  longitude,
  radiusKm,
  city,
  state
) => {
  try {
    const { data, error } = await supabase.rpc('upsert_service_area', {
      p_helper_id: helperId,
      p_lat: latitude,
      p_lng: longitude,
      p_radius_km: radiusKm,
      p_city: city,
      p_state: state,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error upserting service area:', error);
    throw error;
  }
};

/**
 * Deactivate a service area
 * @param {string} serviceAreaId
 * @returns {Promise<boolean>}
 */
export const deactivateServiceArea = async (serviceAreaId) => {
  try {
    const { data, error } = await supabase.rpc('deactivate_service_area', {
      p_service_area_id: serviceAreaId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error deactivating service area:', error);
    throw error;
  }
};

/**
 * Activate a service area
 * @param {string} serviceAreaId
 * @returns {Promise<boolean>}
 */
export const activateServiceArea = async (serviceAreaId) => {
  try {
    const { data, error } = await supabase.rpc('activate_service_area', {
      p_service_area_id: serviceAreaId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error activating service area:', error);
    throw error;
  }
};

/**
 * Find nearby cases for a helper
 * @param {string} helperId
 * @param {number} radiusKm
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export const findNearbyCases = async (helperId, radiusKm = 10, limit = 20) => {
  try {
    const { data, error } = await supabase.rpc('find_nearby_cases', {
      p_helper_id: helperId,
      p_radius_km: radiusKm,
      p_limit: limit,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error finding nearby cases:', error);
    throw error;
  }
};

/**
 * Get distance from a case to a helper
 * @param {string} caseId
 * @param {string} helperId
 * @returns {Promise<number>} Distance in kilometers
 */
export const getCaseHelperDistance = async (caseId, helperId) => {
  try {
    const { data, error } = await supabase.rpc('get_case_helper_distance', {
      p_case_id: caseId,
      p_helper_id: helperId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting case-helper distance:', error);
    throw error;
  }
};

/**
 * Get area coverage statistics
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} radiusKm
 * @returns {Promise<Object>}
 */
export const getAreaCoverageStats = async (latitude, longitude, radiusKm = 10) => {
  try {
    const { data, error } = await supabase.rpc('get_area_coverage_stats', {
      p_lat: latitude,
      p_lng: longitude,
      p_radius_km: radiusKm,
    });

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error getting area coverage stats:', error);
    throw error;
  }
};

/**
 * Use Edge Function for complex location matching with business logic
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export const matchHelpersWithBusinessLogic = async ({
  caseId,
  latitude,
  longitude,
  radiusKm = 10,
  urgencyLevel = 'medium',
  animalType,
  preferredHelperTypes,
}) => {
  try {
    const { data, error } = await supabase.functions.invoke('location-matching', {
      body: {
        caseId,
        lat: latitude,
        lng: longitude,
        radiusKm,
        urgencyLevel,
        animalType,
        preferredHelperTypes,
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error matching helpers with business logic:', error);
    throw error;
  }
};

/**
 * Watch user's location in real-time (for helpers)
 * @param {Function} callback - Called with new location
 * @returns {Promise<Object>} Location subscription object
 */
export const watchLocation = async (callback) => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      throw new Error('Location permission not granted');
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 30000, // Update every 30 seconds
        distanceInterval: 100, // Or when moved 100 meters
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          timestamp: location.timestamp,
        });
      }
    );

    return subscription;
  } catch (error) {
    console.error('Error watching location:', error);
    throw error;
  }
};

/**
 * Get suggested landmarks near a location
 * This is a helper function for when GPS is available but user needs landmark context
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Array>} Array of nearby landmark suggestions
 */
export const getSuggestedLandmarks = async (latitude, longitude) => {
  try {
    // Get reverse geocoded address which includes nearby places
    const address = await reverseGeocode(latitude, longitude);
    
    if (!address) {
      return [];
    }

    const landmarks = [];
    
    // Add named location if available
    if (address.name) {
      landmarks.push({
        type: 'place',
        name: address.name,
        description: 'Current location',
      });
    }

    // Add street information
    if (address.street) {
      landmarks.push({
        type: 'street',
        name: address.street,
        description: 'Street',
      });
    }

    // Add district/area
    if (address.district) {
      landmarks.push({
        type: 'area',
        name: address.district,
        description: 'Area/District',
      });
    }

    // Add city
    if (address.city) {
      landmarks.push({
        type: 'city',
        name: address.city,
        description: 'City',
      });
    }

    return landmarks;
  } catch (error) {
    console.error('Error getting suggested landmarks:', error);
    return [];
  }
};

export default {
  requestLocationPermission,
  getCurrentLocation,
  reverseGeocode,
  findNearbyHelpers,
  findHelpersByServiceArea,
  calculateDistance,
  isWithinServiceArea,
  updateHelperLocation,
  getHelperServiceAreas,
  upsertServiceArea,
  deactivateServiceArea,
  activateServiceArea,
  findNearbyCases,
  getCaseHelperDistance,
  getAreaCoverageStats,
  matchHelpersWithBusinessLogic,
  watchLocation,
  getSuggestedLandmarks,
};
