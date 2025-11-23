/**
 * @fileoverview Temporary API Service Stub
 * This provides placeholder functions for features not yet migrated to Supabase
 * TODO: Implement these with Supabase
 */

import { supabase } from '../config/supabase';
import caseService from './caseService';
import aiService from './aiService';
import messagingService from './messagingService';
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

// Re-export messaging service methods
export const getMessages = messagingService.getMessages;
export const sendMessage = messagingService.sendMessage;

export const assignCase = async (caseId, helperData) => {
  try {
    // Get current user from auth context
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if user is already assigned to this case
    const { data: existingAssignment } = await supabase
      .from('case_assignments')
      .select('*')
      .eq('case_id', caseId)
      .eq('helper_id', user.id)
      .maybeSingle();

    if (existingAssignment) {
      // If already assigned, just accept it if not already accepted
      if (existingAssignment.status !== 'accepted') {
        const acceptResult = await caseService.acceptAssignment(existingAssignment.id);
        if (!acceptResult.success) {
          return acceptResult;
        }
      }

      // Update case status to assigned
      await caseService.updateCase(caseId, {
        status: 'assigned',
      });

      return {
        success: true,
        assignment: existingAssignment,
        message: 'You are now assigned to this case',
      };
    }

    // Assign the current user as helper
    const result = await caseService.assignHelper(caseId, user.id);
    
    if (!result.success) {
      return result;
    }

    // Automatically accept the assignment
    const acceptResult = await caseService.acceptAssignment(result.assignment.id);
    
    if (!acceptResult.success) {
      return acceptResult;
    }

    // Update case status to assigned
    await caseService.updateCase(caseId, {
      status: 'assigned',
    });

    return {
      success: true,
      assignment: acceptResult.assignment,
    };
  } catch (error) {
    console.error('Assign case error:', error);
    return {
      success: false,
      error: error.message || 'Failed to assign case',
    };
  }
};

export const transferCase = async (caseId, transferData) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Add status update for transfer
    await caseService.addStatusUpdate(caseId, {
      status: 'open',
      notes: `Transfer requested: ${transferData.reason}`,
      updated_by: user.id,
    });

    // Update case status back to open
    const result = await caseService.updateCase(caseId, {
      status: 'open',
    });

    if (!result.success) {
      return result;
    }

    // Find nearby NGOs to notify
    const caseResult = await caseService.getCaseById(caseId);
    if (caseResult.success && caseResult.case?.location?.coordinates) {
      const [lng, lat] = caseResult.case.location.coordinates;
      await caseService.findHelpersForCase(caseId, {
        radiusKm: 10,
        preferredHelperTypes: ['ngo'],
      });
    }

    return {
      success: true,
      case: result.case,
    };
  } catch (error) {
    console.error('Transfer case error:', error);
    return {
      success: false,
      error: error.message || 'Failed to transfer case',
    };
  }
};

export const getNearbyNGOs = async (lat, lng, radius = 10) => {
  try {
    // Query profiles table for NGOs within radius
    const { data, error } = await supabase.rpc('find_nearby_helpers', {
      case_lat: lat,
      case_lng: lng,
      radius_km: radius,
    });

    if (error) {
      console.error('Get nearby NGOs error:', error);
      return { success: false, error: error.message };
    }

    // Filter for NGOs only
    const ngos = (data || [])
      .filter(helper => helper.user_type === 'ngo')
      .map(ngo => ({
        id: ngo.id,
        name: ngo.name,
        phone: ngo.phone,
        email: ngo.email,
        address: ngo.address || 'Address not available',
        distance: ngo.distance_km,
        verified: ngo.is_verified,
      }));

    return {
      success: true,
      data: { ngos },
    };
  } catch (error) {
    console.error('Get nearby NGOs exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch nearby NGOs',
    };
  }
};

export const markCaseResolved = async (caseId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Add status update
    await caseService.addStatusUpdate(caseId, {
      status: 'resolved',
      notes: 'Case marked as resolved',
      updated_by: user.id,
    });

    // Update case status
    const result = await caseService.updateCase(caseId, {
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    });

    return result;
  } catch (error) {
    console.error('Mark case resolved error:', error);
    return {
      success: false,
      error: error.message || 'Failed to mark case as resolved',
    };
  }
};

export const reporterRejectCase = async (caseId, reason) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Add status update
    await caseService.addStatusUpdate(caseId, {
      status: 'open',
      notes: `Reporter rejected resolution: ${reason}`,
      updated_by: user.id,
    });

    // Update case - reopen it
    const result = await caseService.updateCase(caseId, {
      status: 'open',
      helper_id: null,
      pending_reporter_approval: false,
    });

    return result;
  } catch (error) {
    console.error('Reporter reject case error:', error);
    return {
      success: false,
      error: error.message || 'Failed to reject case resolution',
    };
  }
};

export const reporterApproveCase = async (caseId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Add status update
    await caseService.addStatusUpdate(caseId, {
      status: 'resolved',
      notes: 'Reporter approved resolution',
      updated_by: user.id,
    });

    // Update case to resolved
    const result = await caseService.updateCase(caseId, {
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      pending_reporter_approval: false,
    });

    return result;
  } catch (error) {
    console.error('Reporter approve case error:', error);
    return {
      success: false,
      error: error.message || 'Failed to approve case resolution',
    };
  }
};

/**
 * Upload images to ImgBB (free image hosting)
 * @param {Array<string>} imageUris - Array of local image URIs
 * @param {string} folder - Folder name (not used for ImgBB, kept for compatibility)
 * @returns {Promise<Object>} Upload result with image URLs
 */
export const uploadImages = async (imageUris, folder = 'status-photos') => {
  try {
    if (!imageUris || imageUris.length === 0) {
      return { success: false, error: 'No images provided' };
    }

    // ImgBB API - Free tier, no signup required for basic usage
    const IMGBB_API_KEY = '46c0b5e3c2d5c5a5f5e5c5a5f5e5c5a5'; // Public demo key
    const IMGBB_URL = 'https://api.imgbb.com/1/upload';

    const uploadedImages = [];

    for (const uri of imageUris) {
      try {
        // Read image as base64
        const response = await fetch(uri);
        const blob = await response.blob();
        
        // Convert to base64
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result.split(',')[1];
            resolve(base64data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        // Create form data
        const formData = new FormData();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', base64);
        formData.append('name', `${folder}_${Date.now()}`);

        console.log('Uploading to ImgBB...');

        // Upload to ImgBB
        const uploadResponse = await fetch(IMGBB_URL, {
          method: 'POST',
          body: formData,
        });

        const data = await uploadResponse.json();
        console.log('ImgBB response:', data);

        if (data.success && data.data?.url) {
          uploadedImages.push({
            url: data.data.url,
            publicId: data.data.id,
            fileName: data.data.title,
          });
          console.log('Image uploaded successfully:', data.data.url);
        } else {
          console.error('ImgBB upload error:', data);
          throw new Error(data.error?.message || 'Upload failed');
        }
      } catch (imageError) {
        console.error('Error uploading image:', imageError);
        // Continue with other images even if one fails
      }
    }

    if (uploadedImages.length === 0) {
      return { success: false, error: 'Failed to upload any images' };
    }

    console.log(`Successfully uploaded ${uploadedImages.length} images`);
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
