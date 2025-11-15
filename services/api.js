/**
 * @fileoverview API service for mobile app
 * Handles all HTTP requests to the backend server
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  async (requestConfig) => {
    // Add auth token if available
    const token = await AsyncStorage.getItem(config.CACHE_KEYS.USER_TOKEN);
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }
    return requestConfig;
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
    console.log('API Error Details:', {
      hasResponse: !!error.response,
      hasRequest: !!error.request,
      message: error.message,
      config: error.config ? {
        url: error.config.url,
        method: error.config.method,
        baseURL: error.config.baseURL
      } : null
    });
    
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      console.log(`Server error ${status}:`, data);
      
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
      console.log('Request details:', error.request);
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
  getCaseTimeline: (id) => api.get(`/api/cases/${id}/timeline`),
  createCase: (data) => api.post('/api/cases', data),
  updateCase: (id, data) => api.put(`/api/cases/${id}`, data),
  assignCase: (id, helperData) => api.post(`/api/cases/${id}/assign`, helperData),
  transferCase: (id, transferData) => api.post(`/api/cases/${id}/transfer`, transferData),
  addStatusUpdate: (id, updateData) => api.post(`/api/cases/${id}/status-update`, updateData),
  markCaseResolved: (id) => api.post(`/api/cases/${id}/mark-resolved`),
  reporterApproveCase: (id) => api.post(`/api/cases/${id}/reporter-approve`),
  reporterRejectCase: (id, reason) => api.post(`/api/cases/${id}/reporter-reject`, { reason }),
  getNearbyNGOs: (latitude, longitude, radius) => api.get('/api/cases/nearby/ngos', { params: { latitude, longitude, radius } }),
  fixMyAssignments: () => api.post('/api/cases/fix-my-assignments'),
  fixPendingApprovals: () => api.post('/api/cases/fix-pending-approvals'),
  
  // Authentication
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  googleAuth: (idToken) => api.post('/api/auth/google', { idToken }),
  logout: () => api.post('/api/auth/logout'),
  requestPasswordReset: (email) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/api/auth/reset-password', { token, password }),
  
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
  markMessagesAsRead: (caseId) => api.post(`/api/messages/${caseId}/mark-read`),
  getUnreadCount: (caseId) => api.get(`/api/messages/${caseId}/unread-count`),
  
  // Upload
  uploadImage: (imageUri) => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    });
    return api.post('/api/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  uploadImages: (imageUris) => {
    const formData = new FormData();
    imageUris.forEach((uri, index) => {
      formData.append('images', {
        uri,
        type: 'image/jpeg',
        name: `photo${index}.jpg`,
      });
    });
    return api.post('/api/upload/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default apiService;
