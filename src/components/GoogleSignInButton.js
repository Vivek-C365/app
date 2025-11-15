/**
 * @fileoverview Google Sign-In Button Component
 * Handles Google OAuth authentication using Firebase Web SDK
 */
import { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../firebase.config';
import { useAuth } from '../contexts/AuthContext';

// Required for Expo AuthSession
WebBrowser.maybeCompleteAuthSession();

export default function GoogleSignInButton() {
  const { firebaseSignIn } = useAuth();
  const [loading, setLoading] = useState(false);

  // Configure Google Auth - let Expo handle redirect URI automatically
  // Expo will use: https://auth.expo.io/@vivekc365/animal-rescue-mobile
  const [, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '514292899346-533hsop5q5rvefeduffr7fivgnhvq8i9.apps.googleusercontent.com',
    androidClientId: '514292899346-eon6c9c5iev00v3i57ilnmfmgljnt4ck.apps.googleusercontent.com',
    iosClientId: '514292899346-533hsop5q5rvefeduffr7fivgnhvq8i9.apps.googleusercontent.com',
  });

  // Handle the response from Google OAuth
  useEffect(() => {
    if (response?.type === 'success') {
      handleAuthSuccess(response);
    } else if (response?.type === 'error') {
      console.error('OAuth error:', response.error);
      Alert.alert('Sign In Error', 'Failed to complete sign in. Please try again.');
      setLoading(false);
    } else if (response?.type === 'cancel') {
      console.log('User cancelled sign in');
      setLoading(false);
    }
  }, [response]);

  const handleAuthSuccess = async (authResponse) => {
    try {
      const { id_token, access_token } = authResponse.params;
      
      // Create Firebase credential with the token
      const credential = GoogleAuthProvider.credential(id_token, access_token);
      
      // Sign in to Firebase with the credential
      const userCredential = await signInWithCredential(auth, credential);
      
      // Get Firebase ID token to send to backend
      const firebaseToken = await userCredential.user.getIdToken();
      
      // Send Firebase token to backend for verification and user creation
      const authResult = await firebaseSignIn(firebaseToken);
      
      if (!authResult.success) {
        Alert.alert('Sign In Failed', authResult.message || 'Failed to sign in with Google');
      }
    } catch (error) {
      console.error('Firebase Google sign-in error:', error);
      Alert.alert('Error', error.message || 'An error occurred during sign-in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      console.log('Starting Google Sign-In with Expo auth proxy...');
      
      await promptAsync();
      // Response will be handled by useEffect
    } catch (error) {
      console.error('Error starting OAuth flow:', error);
      Alert.alert('Error', 'Failed to start sign in. Please try again.');
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleGoogleSignIn}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#333" />
      ) : (
        <>
          <Ionicons name="logo-google" size={20} color="#333" style={styles.icon} />
          <Text style={styles.text}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    marginRight: 12,
  },
  text: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
