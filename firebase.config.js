/**
 * Firebase Configuration
 * This file configures Firebase for Expo
 */
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
// From Firebase Console > Project Settings > General > Your apps > Web app
const firebaseConfig = {
  apiKey: "AIzaSyDOESxLS-I5QzqnMyc_I2bhSS6PHl383sI",
  authDomain: "skillify-a2035.firebaseapp.com",
  projectId: "skillify-a2035",
  storageBucket: "skillify-a2035.firebasestorage.app",
  messagingSenderId: "514292899346",
  appId: "1:514292899346:web:9e548e5f9407b1569a82cb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export { app, auth };
export default app;
