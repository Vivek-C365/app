/**
 * Firebase Authentication Configuration
 * 
 * This app uses Firebase Authentication with Google Sign-In via Expo
 * Configuration uses expo-auth-session for OAuth flows
 */

export const FIREBASE_AUTH_CONFIG = {
  // Web Client ID from Firebase Console
  // Found in: Firebase Console > Project Settings > General > Your apps > Web app
  WEB_CLIENT_ID: '514292899346-533hsop5q5rvefeduffr7fivgnhvq8i9.apps.googleusercontent.com',
  
  // Expo Client ID (same as Web Client ID for Expo Go)
  EXPO_CLIENT_ID: '514292899346-533hsop5q5rvefeduffr7fivgnhvq8i9.apps.googleusercontent.com',
  
  // Android Client ID (from google-services.json)
  ANDROID_CLIENT_ID: '514292899346-eon6c9c5iev00v3i57ilnmfmgljnt4ck.apps.googleusercontent.com',
  
  // iOS Client ID (if you add iOS app to Firebase)
  IOS_CLIENT_ID: '514292899346-533hsop5q5rvefeduffr7fivgnhvq8i9.apps.googleusercontent.com',
};

// Setup Instructions:
// 1. Replace YOUR_ANDROID_CLIENT_ID with your actual Android OAuth client ID
// 2. Replace YOUR_IOS_CLIENT_ID with your actual iOS OAuth client ID (if building for iOS)
// 3. These IDs are found in Firebase Console under your project settings
// 4. For Expo Go, the Expo Client ID is sufficient for testing
