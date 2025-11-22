/**
 * @fileoverview Temporary API Service Stub
 * This provides placeholder functions for features not yet migrated to Supabase
 * TODO: Implement these with Supabase
 */

import caseService from './caseService';
import aiService from './aiService';
import toast from '../utils/toast';

// Re-export case service methods
export const getCases = caseService.getCases;
export const getCaseById = caseService.getCaseById;
export const createCase = caseService.createCase;
export const updateCase = caseService.updateCase;
export const getCaseTimeline = caseService.getCaseTimeline;
export const addStatusUpdate = caseService.addStatusUpdate;

// Re-export AI service methods
export const activateEmergencyAssistance = aiService.activateEmergencyAssistance;
export const getFacilityRecommendations = aiService.getFacilityRecommendations;
export const sendAIChatMessage = aiService.sendAIChatMessage;
export const getEmergencyInstructions = aiService.getEmergencyInstructions;
export const analyzeAnimalPhotos = aiService.analyzeAnimalPhotos;
export const getTransportationOptions = aiService.getTransportationOptions;

// Placeholder methods - TODO: Implement with Supabase
export const getMessages = async (caseId) => {
  console.warn('getMessages not yet implemented with Supabase');
  return { success: true, data: { messages: [] } };
};

export const sendMessage = async (caseId, messageData) => {
  console.warn('sendMessage not yet implemented with Supabase');
  toast.info('Coming Soon', 'Messaging feature is being migrated to Supabase');
  return { success: false, error: 'Not implemented yet' };
};

export const assignCase = async (caseId, helperData) => {
  console.warn('assignCase not yet implemented with Supabase');
  toast.info('Coming Soon', 'Case assignment is being migrated to Supabase');
  return { success: false, error: 'Not implemented yet' };
};

export const transferCase = async (caseId, transferData) => {
  console.warn('transferCase not yet implemented with Supabase');
  toast.info('Coming Soon', 'Case transfer is being migrated to Supabase');
  return { success: false, error: 'Not implemented yet' };
};

export const getNearbyNGOs = async (lat, lng, radius) => {
  console.warn('getNearbyNGOs not yet implemented with Supabase');
  return { success: true, data: { ngos: [] } };
};

export const markCaseResolved = async (caseId) => {
  console.warn('markCaseResolved not yet implemented with Supabase');
  toast.info('Coming Soon', 'Mark resolved is being migrated to Supabase');
  return { success: false, error: 'Not implemented yet' };
};

export const reporterRejectCase = async (caseId, reason) => {
  console.warn('reporterRejectCase not yet implemented with Supabase');
  toast.info('Coming Soon', 'Case rejection is being migrated to Supabase');
  return { success: false, error: 'Not implemented yet' };
};

export const reporterApproveCase = async (caseId) => {
  console.warn('reporterApproveCase not yet implemented with Supabase');
  toast.info('Coming Soon', 'Case approval is being migrated to Supabase');
  return { success: false, error: 'Not implemented yet' };
};

/**
 * Upload images to Supabase Storage
 * @param {Array<string>} imageUris - Array of local image URIs
 * @param {string} bucket - Storage bucket name (default: 'status-photos')
 * @returns {Promise<Object>} Upload result with image URLs
 */
export const uploadImages = async (imageUris, bucket = 'status-photos') => {
  try {
    if (!imageUris || imageUris.length === 0) {
      return { success: false, error: 'No images provided' };
    }

    const { supabase } = require('../config/supabase');
    const uploadedImages = [];

    for (const uri of imageUris) {
      try {
        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const extension = uri.split('.').pop() || 'jpg';
        const fileName = `${timestamp}_${random}.${extension}`;

        // Fetch the image as blob
        const response = await fetch(uri);
        const blob = await response.blob();

        // Convert blob to ArrayBuffer for Supabase
        const arrayBuffer = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        });

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, arrayBuffer, {
            contentType: blob.type || 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Upload error:', error);
          throw error;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        uploadedImages.push({
          url: publicUrl,
          path: data.path,
          fileName: fileName,
        });
      } catch (imageError) {
        console.error('Error uploading image:', imageError);
        // Continue with other images even if one fails
      }
    }

    if (uploadedImages.length === 0) {
      return { success: false, error: 'Failed to upload any images' };
    }

    return {
      success: true,
      data: {
        images: uploadedImages,
      },
    };
  } catch (error) {
    console.error('Upload images exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload images',
    };
  }
};

export default {
  getCases,
  getCaseById,
  createCase,
  updateCase,
  getCaseTimeline,
  addStatusUpdate,
  getMessages,
  sendMessage,
  assignCase,
  transferCase,
  getNearbyNGOs,
  markCaseResolved,
  reporterRejectCase,
  reporterApproveCase,
  uploadImages,
  // AI Emergency Assistance
  activateEmergencyAssistance,
  getFacilityRecommendations,
  sendAIChatMessage,
  getEmergencyInstructions,
  analyzeAnimalPhotos,
  getTransportationOptions,
};
