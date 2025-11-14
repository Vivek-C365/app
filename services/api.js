/**
 * @fileoverview API service for mobile app
 * Handles all HTTP requests to the backend server
 */

import axios from 'axios';
import config from '../config';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: config.API_URL,
  timeout: config.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    // Add auth token if available
    // const token = await AsyncStorage.getItem(config.CACHE_KEYS.USER_TOKEN);
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      if (status === 401) {
        // Handle unauthorized - clear token and redirect to login
        console.log('Unauthorized - clearing token');
      } else if (status === 403) {
        console.log('Forbidden - insufficient permissions');
      } else if (status === 404) {
        console.log('Resource not found');
      } else if (status >= 500) {
        console.log('Server error');
      }
      
      return Promise.reject(data || error.message);
    } else if (error.request) {
      // Request made but no response received
      console.log('Network error - no response from server');
      return Promise.reject({ message: 'Network error. Please check your connection.' });
    } else {
      // Something else happened
      console.log('Request error:', error.message);
      return Promise.reject({ message: error.message });
    }
  }
);

/**
 * API service methods
 */
const apiService = {
  // Health check
  healthCheck: () => api.get('/health'),
  
  // Cases
  getCases: (params) => api.get('/api/cases', { params }),
  getCaseById: (id) => api.get(`/api/cases/${id}`),
  createCase: (data) => api.post('/api/cases', data),
  updateCase: (id, data) => api.put(`/api/cases/${id}`, data),
  
  // Authentication
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  logout: () => api.post('/api/auth/logout'),
  
  // User
  getProfile: () => api.get('/api/users/profile'),
  updateProfile: (data) => api.put('/api/users/profile', data),
  
  // Location
  getNearbyVolunteers: (location) => api.post('/api/location/nearby-volunteers', location),
  geocode: (address) => api.post('/api/location/geocode', { address }),
  
  // Notifications
  getNotificationPreferences: () => api.get('/api/notifications/preferences'),
  updateNotificationPreferences: (preferences) => api.put('/api/notifications/preferences', preferences),
  
  // Messages
  getMessages: (caseId) => api.get(`/api/messages/${caseId}`),
  sendMessage: (caseId, message) => api.post(`/api/messages/${caseId}`, message),
};

export default apiService;
