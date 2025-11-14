/**
 * @fileoverview Mobile app configuration
 * Central configuration for API endpoints and app settings
 */

// Determine the API URL based on environment
const getApiUrl = () => {
  // For Expo development, use your local machine's IP address
  // Replace with your actual IP address when testing on physical device
  if (__DEV__) {
    // For Android emulator, use 10.0.2.2
    // For iOS simulator, use localhost
    // For physical device, use your computer's IP address
    return 'http://localhost:3000';
  }
  
  // Production API URL
  return 'https://api.animalrescue.com';
};

const config = {
  // API Configuration
  API_URL: getApiUrl(),
  API_TIMEOUT: 30000, // 30 seconds
  
  // Socket.io Configuration
  SOCKET_URL: getApiUrl(),
  
  // Map Configuration
  DEFAULT_LOCATION: {
    latitude: 19.0760, // Mumbai coordinates as default
    longitude: 72.8777,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  
  // Search radius in kilometers
  DEFAULT_SEARCH_RADIUS: 10,
  
  // File Upload Configuration
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGES_PER_REPORT: 5,
  
  // Notification Configuration
  NOTIFICATION_CHANNELS: {
    EMERGENCY: 'emergency',
    UPDATES: 'updates',
    MESSAGES: 'messages',
  },
  
  // Cache Configuration
  CACHE_KEYS: {
    USER_TOKEN: '@user_token',
    USER_DATA: '@user_data',
    LOCATION_PERMISSION: '@location_permission',
    NOTIFICATION_PERMISSION: '@notification_permission',
  },
  
  // App Configuration
  APP_NAME: 'Animal Rescue',
  SUPPORT_PHONE: '+911234567890',
  SUPPORT_EMAIL: 'support@animalrescue.com',
};

export default config;
