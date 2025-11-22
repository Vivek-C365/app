/**
 * @fileoverview AI Emergency Assistance Service
 * Handles AI-powered emergency assistance using Google Gemini
 */
import { supabase } from '../config/supabase';

/**
 * Activate AI emergency assistance for a case
 * @param {string} caseId - Case ID
 * @returns {Promise<Object>} Activation result
 */
export const activateEmergencyAssistance = async (caseId) => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-emergency', {
      body: { caseId, action: 'activate' },
    });

    if (error) {
      console.error('Activate AI emergency error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Activate AI emergency exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to activate AI assistance',
    };
  }
};

/**
 * Get facility recommendations for a case
 * @param {string} caseId - Case ID
 * @param {Object} location - Location coordinates
 * @param {number} location.latitude - Latitude
 * @param {number} location.longitude - Longitude
 * @param {string} animalType - Type of animal
 * @returns {Promise<Object>} Facility recommendations
 */
export const getFacilityRecommendations = async (caseId, location, animalType) => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-emergency', {
      body: {
        caseId,
        action: 'find_facilities',
        location,
        animalType,
      },
    });

    if (error) {
      console.error('Get facility recommendations error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      facilities: data?.facilities || [],
    };
  } catch (error) {
    console.error('Get facility recommendations exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to get facility recommendations',
    };
  }
};

/**
 * Send a message to AI chat for guidance
 * @param {string} caseId - Case ID
 * @param {string} message - User message
 * @param {Array} chatHistory - Previous chat messages
 * @returns {Promise<Object>} AI response
 */
export const sendAIChatMessage = async (caseId, message, chatHistory = []) => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        caseId,
        message,
        chatHistory,
      },
    });

    if (error) {
      console.error('Send AI chat message error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      response: data?.response || '',
      suggestions: data?.suggestions || [],
    };
  } catch (error) {
    console.error('Send AI chat message exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to get AI response',
    };
  }
};

/**
 * Get emergency instructions for immediate care
 * @param {string} caseId - Case ID
 * @param {string} animalType - Type of animal
 * @param {string} condition - Animal condition description
 * @param {Array<string>} photos - Photo URLs for analysis
 * @returns {Promise<Object>} Emergency instructions
 */
export const getEmergencyInstructions = async (caseId, animalType, condition, photos = []) => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-emergency', {
      body: {
        caseId,
        action: 'emergency_instructions',
        animalType,
        condition,
        photos,
      },
    });

    if (error) {
      console.error('Get emergency instructions error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      instructions: data?.instructions || [],
      safetyWarnings: data?.safetyWarnings || [],
      urgencyLevel: data?.urgencyLevel || 'medium',
    };
  } catch (error) {
    console.error('Get emergency instructions exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to get emergency instructions',
    };
  }
};

/**
 * Analyze animal photos for injury assessment
 * @param {Array<string>} photos - Photo URLs
 * @param {string} animalType - Type of animal
 * @returns {Promise<Object>} Photo analysis result
 */
export const analyzeAnimalPhotos = async (photos, animalType) => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-emergency', {
      body: {
        action: 'analyze_photos',
        photos,
        animalType,
      },
    });

    if (error) {
      console.error('Analyze photos error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      analysis: data?.analysis || '',
      injuryAssessment: data?.injuryAssessment || {},
      recommendedActions: data?.recommendedActions || [],
    };
  } catch (error) {
    console.error('Analyze photos exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to analyze photos',
    };
  }
};

/**
 * Get transportation options to a facility
 * @param {Object} origin - Origin location
 * @param {number} origin.latitude - Origin latitude
 * @param {number} origin.longitude - Origin longitude
 * @param {Object} destination - Destination location
 * @param {number} destination.latitude - Destination latitude
 * @param {number} destination.longitude - Destination longitude
 * @returns {Promise<Object>} Transportation options
 */
export const getTransportationOptions = async (origin, destination) => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-emergency', {
      body: {
        action: 'transportation_options',
        origin,
        destination,
      },
    });

    if (error) {
      console.error('Get transportation options error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      options: data?.options || [],
    };
  } catch (error) {
    console.error('Get transportation options exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to get transportation options',
    };
  }
};

export default {
  activateEmergencyAssistance,
  getFacilityRecommendations,
  sendAIChatMessage,
  getEmergencyInstructions,
  analyzeAnimalPhotos,
  getTransportationOptions,
};
