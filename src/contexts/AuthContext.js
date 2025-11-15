/**
 * @fileoverview Authentication Context
 * Manages user authentication state and provides auth methods
 */
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import apiService from '../../services/api';
import config from '../../config';

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
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Check if biometric authentication is available
  useEffect(() => {
    checkBiometricAvailability();
    loadStoredAuth();
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

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(config.CACHE_KEYS.USER_TOKEN);
      const storedUser = await AsyncStorage.getItem(config.CACHE_KEYS.USER_DATA);
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await apiService.login({ email, password });
      
      if (response.success && response.data && response.data.token) {
        await AsyncStorage.setItem(config.CACHE_KEYS.USER_TOKEN, response.data.token);
        await AsyncStorage.setItem(config.CACHE_KEYS.USER_DATA, JSON.stringify(response.data.user));
        
        setToken(response.data.token);
        setUser(response.data.user);
        
        return { success: true };
      }
      
      return { success: false, message: response.error?.message || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await apiService.register(userData);
      
      if (response.success && response.data && response.data.token) {
        await AsyncStorage.setItem(config.CACHE_KEYS.USER_TOKEN, response.data.token);
        await AsyncStorage.setItem(config.CACHE_KEYS.USER_DATA, JSON.stringify(response.data.user));
        
        setToken(response.data.token);
        setUser(response.data.user);
        
        return { success: true };
      }
      
      return { success: false, message: response.error?.message || 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: error.message || 'Registration failed' };
    }
  };

  const firebaseSignIn = async (firebaseToken) => {
    try {
      const response = await apiService.googleAuth(firebaseToken);
      
      if (response.success && response.data && response.data.token) {
        await AsyncStorage.setItem(config.CACHE_KEYS.USER_TOKEN, response.data.token);
        await AsyncStorage.setItem(config.CACHE_KEYS.USER_DATA, JSON.stringify(response.data.user));
        
        setToken(response.data.token);
        setUser(response.data.user);
        
        return { success: true };
      }
      
      return { success: false, message: response.error?.message || 'Firebase sign-in failed' };
    } catch (error) {
      console.error('Firebase sign-in error:', error);
      return { success: false, message: error.message || 'Firebase sign-in failed' };
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem(config.CACHE_KEYS.USER_TOKEN);
      await AsyncStorage.removeItem(config.CACHE_KEYS.USER_DATA);
      setToken(null);
      setUser(null);
    }
  };

  const authenticateWithBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your account',
        fallbackLabel: 'Use password',
        disableDeviceFallback: false,
      });
      
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
    token,
    loading,
    isAuthenticated: !!token,
    biometricEnabled,
    biometricAvailable,
    login,
    register,
    firebaseSignIn,
    logout,
    authenticateWithBiometric,
    enableBiometric,
    disableBiometric,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
