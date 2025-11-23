/**
 * @fileoverview Mobile app configuration
 * Central configuration for API endpoints and app settings
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// NOTE: This app uses Supabase, not a custom backend API
// The old Express backend is no longer used
// All API calls should go through Supabase client (src/config/supabase.js)
const API_URL = null; // Deprecated - use Supabase instead

console.log('=== API Configuration ===');
console.log('Backend: Supabase');
console.log('Platform:', Platform.OS);
console.log('========================');

const config = {
  // API Configuration
  API_URL,
  API_TIMEOUT: 30000, // 30 seconds
  
  // Socket.io Configuration (deprecated - use Supabase Realtime)
  SOCKET_URL: null,
  
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
  
  // Cloudinary Configuration
  // In Expo, EXPO_PUBLIC_ prefixed vars are automatically available
  CLOUDINARY_CLOUD_NAME: 'drksnjhgi',
  CLOUDINARY_API_KEY: '116776654212154',
  CLOUDINARY_API_SECRET: 'Kcec1tpdts1M7SUPAK24fkxrQ6E',
  CLOUDINARY_UPLOAD_PRESET: 'ml_default',
  
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
