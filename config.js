/**
 * @fileoverview Mobile app configuration
 * Central configuration for API endpoints and app settings
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Determine the API URL based on environment
const getApiUrl = () => {
  // For Expo development, use your local machine's IP address
  if (__DEV__) {
    // For physical device testing, use your computer's IP address
    // Find your IP: Run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux)
    // const PHYSICAL_DEVICE_IP = 'http://10.100.59.248:3000'; // Replace with your IP
    
    // For Android emulator, use 10.0.2.2 (special alias to host machine)
    if (Platform.OS === 'android') {
      // Check if running on physical device (has a real IP in manifest)
      const { manifest } = Constants;
      if (manifest?.debuggerHost) {
        // Extract IP from debuggerHost (format: "192.168.1.100:19000")
        const ip = manifest.debuggerHost.split(':')[0];
        console.log('Using physical device IP:', ip);
        return `http://${ip}:3000`;
      }
      // Android emulator - try your computer's IP first, fallback to 10.0.2.2
      // If 10.0.2.2 doesn't work due to firewall, use your computer's actual IP
      console.log('Using computer IP for Android emulator: 10.100.59.248:3000');
      return 'http://10.100.59.248:3000';
    }
    // For iOS simulator, use localhost
    console.log('Using iOS simulator IP: localhost:3000');
    return 'http://localhost:3000';
  }
  
  // Production API URL
  return 'https://api.animalrescue.com';
};

const API_URL = getApiUrl();
console.log('=== API Configuration ===');
console.log('API URL:', API_URL);
console.log('Platform:', Platform.OS);
console.log('========================');

const config = {
  // API Configuration
  API_URL,
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
