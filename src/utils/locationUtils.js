/**
 * Location Utility Functions
 * Helper functions for location formatting and validation
 */

/**
 * Format coordinates to display string
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {number} precision - Decimal places (default: 6)
 * @returns {string} Formatted coordinates
 */
export const formatCoordinates = (latitude, longitude, precision = 6) => {
  if (!latitude || !longitude) return 'N/A';
  
  const lat = parseFloat(latitude).toFixed(precision);
  const lon = parseFloat(longitude).toFixed(precision);
  
  return `${lat}, ${lon}`;
};

/**
 * Format distance in human-readable format
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance
 */
export const formatDistance = (distanceKm) => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} meters`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  } else {
    return `${Math.round(distanceKm)} km`;
  }
};

/**
 * Validate latitude value
 * @param {number} latitude - Latitude to validate
 * @returns {boolean} True if valid
 */
export const isValidLatitude = (latitude) => {
  const lat = parseFloat(latitude);
  return !isNaN(lat) && lat >= -90 && lat <= 90;
};

/**
 * Validate longitude value
 * @param {number} longitude - Longitude to validate
 * @returns {boolean} True if valid
 */
export const isValidLongitude = (longitude) => {
  const lon = parseFloat(longitude);
  return !isNaN(lon) && lon >= -180 && lon <= 180;
};

/**
 * Validate coordinates
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Object} Validation result
 */
export const validateCoordinates = (latitude, longitude) => {
  const errors = [];
  
  if (!isValidLatitude(latitude)) {
    errors.push('Invalid latitude (must be between -90 and 90)');
  }
  
  if (!isValidLongitude(longitude)) {
    errors.push('Invalid longitude (must be between -180 and 180)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Check if location is in India (approximate bounds)
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {boolean} True if likely in India
 */
export const isInIndia = (latitude, longitude) => {
  // Approximate bounds for India
  const INDIA_BOUNDS = {
    minLat: 6.5,
    maxLat: 35.5,
    minLon: 68.0,
    maxLon: 97.5
  };
  
  return (
    latitude >= INDIA_BOUNDS.minLat &&
    latitude <= INDIA_BOUNDS.maxLat &&
    longitude >= INDIA_BOUNDS.minLon &&
    longitude <= INDIA_BOUNDS.maxLon
  );
};

/**
 * Get location accuracy description
 * @param {number} accuracy - Accuracy in meters
 * @returns {string} Human-readable accuracy description
 */
export const getAccuracyDescription = (accuracy) => {
  if (!accuracy) return 'Unknown';
  
  if (accuracy < 10) return 'Very High';
  if (accuracy < 50) return 'High';
  if (accuracy < 100) return 'Medium';
  if (accuracy < 500) return 'Low';
  return 'Very Low';
};

/**
 * Create Google Maps URL for coordinates
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {number} zoom - Map zoom level (default: 15)
 * @returns {string} Google Maps URL
 */
export const createMapsUrl = (latitude, longitude, zoom = 15) => {
  return `https://www.google.com/maps?q=${latitude},${longitude}&z=${zoom}`;
};

/**
 * Create location object for API submission
 * @param {Object} locationData - Location data from LocationSelector
 * @returns {Object} Formatted location object for API
 */
export const formatLocationForAPI = (locationData) => {
  if (!locationData) return null;
  
  const location = {
    isApproximate: locationData.isApproximate || false,
    timestamp: locationData.timestamp || Date.now()
  };
  
  // GPS-based location
  if (locationData.coordinates) {
    location.coordinates = [
      locationData.coordinates.longitude,
      locationData.coordinates.latitude
    ];
    location.accuracy = locationData.accuracy;
    location.address = locationData.address;
  }
  
  // Landmark-based location
  if (locationData.nearestPlace) {
    location.nearestKnownPlace = locationData.nearestPlace;
  }
  
  if (locationData.landmarks) {
    location.landmarks = locationData.landmarks;
  }
  
  if (locationData.directions) {
    location.directions = locationData.directions;
  }
  
  if (locationData.city) {
    location.city = locationData.city;
  }
  
  if (locationData.state) {
    location.state = locationData.state;
  }
  
  if (locationData.description) {
    location.description = locationData.description;
  }
  
  return location;
};

/**
 * Parse location from API response
 * @param {Object} apiLocation - Location object from API
 * @returns {Object} Parsed location data
 */
export const parseLocationFromAPI = (apiLocation) => {
  if (!apiLocation) return null;
  
  const location = {
    isApproximate: apiLocation.isApproximate || false
  };
  
  // Parse coordinates if available
  if (apiLocation.coordinates && Array.isArray(apiLocation.coordinates)) {
    location.coordinates = {
      longitude: apiLocation.coordinates[0],
      latitude: apiLocation.coordinates[1]
    };
  }
  
  // Parse other location fields
  if (apiLocation.address) location.address = apiLocation.address;
  if (apiLocation.landmarks) location.landmarks = apiLocation.landmarks;
  if (apiLocation.nearestKnownPlace) location.nearestPlace = apiLocation.nearestKnownPlace;
  if (apiLocation.directions) location.directions = apiLocation.directions;
  if (apiLocation.city) location.city = apiLocation.city;
  if (apiLocation.state) location.state = apiLocation.state;
  if (apiLocation.description) location.description = apiLocation.description;
  
  return location;
};

/**
 * Get location display text
 * @param {Object} location - Location object
 * @returns {string} Display text for location
 */
export const getLocationDisplayText = (location) => {
  if (!location) return 'Location not available';
  
  // GPS location
  if (location.coordinates) {
    return location.address || formatCoordinates(
      location.coordinates.latitude,
      location.coordinates.longitude
    );
  }
  
  // Landmark-based location
  const parts = [];
  if (location.nearestPlace) parts.push(`Near ${location.nearestPlace}`);
  if (location.city) parts.push(location.city);
  if (location.state) parts.push(location.state);
  
  return parts.length > 0 ? parts.join(', ') : 'Location described by landmarks';
};

/**
 * Check if location data is complete enough for submission
 * @param {Object} locationData - Location data to validate
 * @returns {Object} Validation result
 */
export const validateLocationForSubmission = (locationData) => {
  if (!locationData) {
    return {
      isValid: false,
      message: 'Location is required'
    };
  }
  
  // GPS location validation
  if (locationData.coordinates) {
    const coordValidation = validateCoordinates(
      locationData.coordinates.latitude,
      locationData.coordinates.longitude
    );
    
    if (!coordValidation.isValid) {
      return {
        isValid: false,
        message: coordValidation.errors.join(', ')
      };
    }
    
    return { isValid: true };
  }
  
  // Landmark-based location validation
  if (!locationData.nearestPlace && !locationData.landmarks && !locationData.address) {
    return {
      isValid: false,
      message: 'Please provide at least one of: nearest place, landmarks, or address'
    };
  }
  
  if (!locationData.city) {
    return {
      isValid: false,
      message: 'City is required for landmark-based location'
    };
  }
  
  return { isValid: true };
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Degrees to convert
 * @returns {number} Radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};
