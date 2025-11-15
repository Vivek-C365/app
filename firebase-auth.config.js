/**
 * Firebase Authentication Configuration
 * 
 * This app uses Firebase Authentication with Google Sign-In via Expo
 * Configuration uses expo-auth-session for OAuth flows
 */

export const FIREBASE_AUTH_CONFIG = {
  // Primary Client ID - Android OAuth Client ID
  // This is the main client ID used for authentication
  CLIENT_ID: '514292899346-eon6c9c5iev00v3i57ilnmfmgljnt4ck.apps.googleusercontent.com',
  
  // Android Client ID (from google-services.json)
  ANDROID_CLIENT_ID: '514292899346-eon6c9c5iev00v3i57ilnmfmgljnt4ck.apps.googleusercontent.com',
  
  // iOS Client ID (same as Android for now)
  IOS_CLIENT_ID: '514292899346-eon6c9c5iev00v3i57ilnmfmgljnt4ck.apps.googleusercontent.com',
  
  // Web Client ID (same as Android for now)
  WEB_CLIENT_ID: '514292899346-eon6c9c5iev00v3i57ilnmfmgljnt4ck.apps.googleusercontent.com',
  
  // Expo Client ID (same as Android for Expo Go)
  EXPO_CLIENT_ID: '514292899346-eon6c9c5iev00v3i57ilnmfmgljnt4ck.apps.googleusercontent.com',
};

// Setup Instructions:
// 1. Replace YOUR_ANDROID_CLIENT_ID with your actual Android OAuth client ID
// 2. Replace YOUR_IOS_CLIENT_ID with your actual iOS OAuth client ID (if building for iOS)
// 3. These IDs are found in Firebase Console under your project settings
// 4. For Expo Go, the Expo Client ID is sufficient for testing
