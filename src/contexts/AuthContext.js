/**
 * @fileoverview Authentication Context
 * Manages user authentication state and provides auth methods using Supabase Auth
 */
import React, { createContext, useState, useContext, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Initialize auth state and set up listener
  useEffect(() => {
    checkBiometricAvailability();
    initializeAuth();

    // Set up auth state change listener
    const subscription = authService.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (session) {
        setSession(session);
        setUser(session.user);
        
        // Load user profile from profiles table
        const profile = await authService.getUserProfile(session.user.id);
        setProfile(profile);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
      
      if (compatible && enrolled) {
        const enabled = await AsyncStorage.getItem('@biometric_enabled');
        setBiometricEnabled(enabled === 'true');
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  const initializeAuth = async () => {
    try {
      // Get current session from Supabase (stored in AsyncStorage)
      const session = await authService.getSession();
      
      if (session) {
        setSession(session);
        setUser(session.user);
        
        // Load user profile
        const profile = await authService.getUserProfile(session.user.id);
        setProfile(profile);
      } else {
        // No session found - user is not logged in (this is normal)
        console.log('Auth state changed: INITIAL_SESSION - No active session');
      }
    } catch (error) {
      // Only log unexpected errors
      if (error.message !== 'Auth session missing!') {
        console.error('Error initializing auth:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const result = await authService.signIn(email, password);
      
      if (result.success) {
        setSession(result.session);
        setUser(result.user);
        
        // Load user profile
        const profile = await authService.getUserProfile(result.user.id);
        setProfile(profile);
        
        return { success: true };
      }
      
      return { success: false, message: result.error || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const result = await authService.signUp(userData);
      
      if (result.success) {
        // Check if email confirmation is required
        if (result.requiresEmailConfirmation) {
          return {
            success: true,
            requiresEmailConfirmation: true,
            message: result.message,
          };
        }
        
        setSession(result.session);
        setUser(result.user);
        
        // Load user profile (created by database trigger)
        const profile = await authService.getUserProfile(result.user.id);
        setProfile(profile);
        
        return { success: true };
      }
      
      return { success: false, message: result.error || 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: error.message || 'Registration failed' };
    }
  };

  const loginWithMagicLink = async (email) => {
    try {
      const result = await authService.signInWithMagicLink(email);
      
      if (result.success) {
        return {
          success: true,
          message: result.message,
        };
      }
      
      return { success: false, message: result.error || 'Failed to send magic link' };
    } catch (error) {
      console.error('Magic link error:', error);
      return { success: false, message: error.message || 'Failed to send magic link' };
    }
  };

  const logout = async () => {
    try {
      await authService.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: error.message || 'Logout failed' };
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      const result = await authService.resetPassword(email);
      return result;
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, message: error.message || 'Password reset failed' };
    }
  };

  const updateUserPassword = async (newPassword) => {
    try {
      const result = await authService.updatePassword(newPassword);
      return result;
    } catch (error) {
      console.error('Update password error:', error);
      return { success: false, message: error.message || 'Password update failed' };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      if (!user) {
        return { success: false, message: 'No user logged in' };
      }
      
      const result = await authService.updateUserProfile(user.id, profileData);
      
      if (result.success) {
        setProfile(result.profile);
      }
      
      return result;
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: error.message || 'Profile update failed' };
    }
  };

  const refreshUserSession = async () => {
    try {
      const result = await authService.refreshSession();
      
      if (result.success) {
        setSession(result.session);
        setUser(result.session.user);
      }
      
      return result;
    } catch (error) {
      console.error('Refresh session error:', error);
      return { success: false, message: error.message || 'Session refresh failed' };
    }
  };

  const authenticateWithBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your account',
        fallbackLabel: 'Use password',
        disableDeviceFallback: false,
      });
      
      if (result.success) {
        // Refresh session after successful biometric auth
        await refreshUserSession();
      }
      
      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  };

  const enableBiometric = async () => {
    try {
      await AsyncStorage.setItem('@biometric_enabled', 'true');
      setBiometricEnabled(true);
      return true;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return false;
    }
  };

  const disableBiometric = async () => {
    try {
      await AsyncStorage.setItem('@biometric_enabled', 'false');
      setBiometricEnabled(false);
      return true;
    } catch (error) {
      console.error('Error disabling biometric:', error);
      return false;
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    isAuthenticated: !!session,
    biometricEnabled,
    biometricAvailable,
    login,
    register,
    loginWithMagicLink,
    logout,
    requestPasswordReset,
    updateUserPassword,
    updateProfile,
    refreshUserSession,
    authenticateWithBiometric,
    enableBiometric,
    disableBiometric,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
