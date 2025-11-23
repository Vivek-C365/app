/**
 * @fileoverview Case Service using Supabase
 * Handles all case-related operations
 */
import { supabase } from '../config/supabase';
import { matchHelpersWithBusinessLogic } from './locationService';

/**
 * Get cases with optional filters
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status (open, assigned, in_progress, resolved, closed)
 * @param {number} params.limit - Number of cases to return
 * @param {number} params.offset - Offset for pagination
 * @returns {Promise<Object>} Cases result
 */
export const getCases = async (params = {}) => {
  try {
    let query = supabase
      .from('cases')
      .select(`
        *,
        case_assignments!case_assignments_case_id_fkey(
          id,
          helper_id,
          status,
          accepted_at
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get cases error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Transform cases and add helper_id from assignments
    const transformedCases = (data || []).map(caseData => {
      const transformed = transformCase(caseData);
      
      // Get the accepted assignment if exists
      const acceptedAssignment = caseData.case_assignments?.find(a => a.status === 'accepted');
      if (acceptedAssignment) {
        transformed.helper_id = acceptedAssignment.helper_id;
      }
      
      return transformed;
    });

    return {
      success: true,
      cases: transformedCases,
    };
  } catch (error) {
    console.error('Get cases exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch cases',
    };
  }
};

/**
 * Transform case data from database format to app format
 */
const transformCase = (caseData) => {
  if (!caseData) return null;
  
  // Extract coordinates from PostGIS point
  let coordinates = null;
  if (caseData.location_point) {
    // PostGIS returns coordinates as [lng, lat]
    coordinates = caseData.location_point.coordinates || null;
  }
  
  return {
    ...caseData,
    // Add camelCase aliases for easier access
    caseId: caseData.id,
    animalType: caseData.animal_type,
    urgencyLevel: caseData.urgency_level,
    contactInfo: caseData.contact_info,
    createdAt: caseData.created_at,
    updatedAt: caseData.updated_at,
    reporterId: caseData.reporter_id,
    location: {
      address: caseData.location_address,
      landmarks: caseData.location_landmarks,
      description: caseData.location_description,
      coordinates: coordinates,
      isApproximate: caseData.location_is_approximate,
    },
  };
};

/**
 * Get a single case by ID
 * @param {string} id - Case ID
 * @returns {Promise<Object>} Case result
 */
export const getCaseById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        case_assignments!case_assignments_case_id_fkey(
          id,
          helper_id,
          status,
          accepted_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Get case error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Fetch reporter profile separately
    if (data && data.reporter_id) {
      const { data: reporterData } = await supabase
        .from('profiles')
        .select('id, name, phone, user_type, email')
        .eq('id', data.reporter_id)
        .single();
      
      if (reporterData) {
        data.reporter = reporterData;
      }
    }

    // Get assigned helpers from case_assignments with full profile data
    const assignedHelpers = [];
    if (data.case_assignments) {
      for (const assignment of data.case_assignments) {
        if (assignment.status === 'accepted' && assignment.helper_id) {
          // Fetch helper profile
          const { data: helperProfile } = await supabase
            .from('profiles')
            .select('id, name, phone, user_type, email, verification_status')
            .eq('id', assignment.helper_id)
            .single();
          
          if (helperProfile) {
            assignedHelpers.push({
              id: helperProfile.id,
              name: helperProfile.name,
              phone: helperProfile.phone,
              userType: helperProfile.user_type,
              email: helperProfile.email,
              verification: {
                status: helperProfile.verification_status
              }
            });
          }
        }
      }
    }

    const transformedCase = transformCase(data);
    transformedCase.assignedHelpers = assignedHelpers;

    return {
      success: true,
      case: transformedCase,
    };
  } catch (error) {
    console.error('Get case exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch case',
    };
  }
};

/**
 * Create a new case
 * @param {Object} caseData - Case data
 * @returns {Promise<Object>} Create result
 */
export const createCase = async (caseData) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .insert([caseData])
      .select()
      .single();

    if (error) {
      console.error('Create case error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      case: data,
    };
  } catch (error) {
    console.error('Create case exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to create case',
    };
  }
};

/**
 * Update a case
 * @param {string} id - Case ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Update result
 */
export const updateCase = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update case error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      case: data,
    };
  } catch (error) {
    console.error('Update case exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to update case',
    };
  }
};

/**
 * Get case timeline (status updates)
 * @param {string} caseId - Case ID
 * @returns {Promise<Object>} Timeline result
 */
export const getCaseTimeline = async (caseId) => {
  try {
    const { data, error } = await supabase
      .from('status_updates')
      .select(`
        *,
        updated_by:profiles!updated_by(id, name, user_type)
      `)
      .eq('case_id', caseId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Get timeline error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      timeline: data || [],
    };
  } catch (error) {
    console.error('Get timeline exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch timeline',
    };
  }
};

/**
 * Add status update to a case
 * @param {string} caseId - Case ID
 * @param {Object} updateData - Status update data
 * @returns {Promise<Object>} Update result
 */
export const addStatusUpdate = async (caseId, updateData) => {
  try {
    const { data, error} = await supabase
      .from('status_updates')
      .insert([{ ...updateData, case_id: caseId }])
      .select()
      .single();

    if (error) {
      console.error('Add status update error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      update: data,
    };
  } catch (error) {
    console.error('Add status update exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to add status update',
    };
  }
};

/**
 * Search cases with filters
 * @param {Object} filters - Search filters
 * @param {string} filters.animalType - Filter by animal type
 * @param {string} filters.status - Filter by status
 * @param {string} filters.urgencyLevel - Filter by urgency level
 * @param {string} filters.searchText - Search in description and location
 * @param {number} filters.limit - Number of results
 * @param {number} filters.offset - Pagination offset
 * @returns {Promise<Object>} Search result
 */
export const searchCases = async (filters = {}) => {
  try {
    let query = supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.animalType) {
      query = query.eq('animal_type', filters.animalType);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.urgencyLevel) {
      query = query.eq('urgency_level', filters.urgencyLevel);
    }

    if (filters.searchText) {
      query = query.or(`description.ilike.%${filters.searchText}%,location_landmarks.ilike.%${filters.searchText}%,location_address.ilike.%${filters.searchText}%`);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Search cases error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      cases: (data || []).map(transformCase),
    };
  } catch (error) {
    console.error('Search cases exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to search cases',
    };
  }
};

/**
 * Assign a helper to a case
 * @param {string} caseId - Case ID
 * @param {string} helperId - Helper user ID
 * @returns {Promise<Object>} Assignment result
 */
export const assignHelper = async (caseId, helperId) => {
  try {
    // Create assignment record
    const { data: assignment, error: assignError } = await supabase
      .from('case_assignments')
      .insert([{
        case_id: caseId,
        helper_id: helperId,
        status: 'pending',
      }])
      .select()
      .single();

    if (assignError) {
      console.error('Assign helper error:', assignError);
      return {
        success: false,
        error: assignError.message,
      };
    }

    return {
      success: true,
      assignment,
    };
  } catch (error) {
    console.error('Assign helper exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to assign helper',
    };
  }
};

/**
 * Accept a case assignment
 * @param {string} assignmentId - Assignment ID
 * @returns {Promise<Object>} Accept result
 */
export const acceptAssignment = async (assignmentId) => {
  try {
    const { data, error } = await supabase
      .from('case_assignments')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) {
      console.error('Accept assignment error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Update case status to assigned
    if (data && data.case_id) {
      await updateCase(data.case_id, { status: 'assigned' });
    }

    return {
      success: true,
      assignment: data,
    };
  } catch (error) {
    console.error('Accept assignment exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to accept assignment',
    };
  }
};

/**
 * Get case assignments for a helper
 * @param {string} helperId - Helper user ID
 * @returns {Promise<Object>} Assignments result
 */
export const getHelperAssignments = async (helperId) => {
  try {
    const { data, error } = await supabase
      .from('case_assignments')
      .select(`
        *,
        case:cases(*)
      `)
      .eq('helper_id', helperId)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Get assignments error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      assignments: data || [],
    };
  } catch (error) {
    console.error('Get assignments exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch assignments',
    };
  }
};

/**
 * Get case assignments for a specific case
 * @param {string} caseId - Case ID
 * @returns {Promise<Object>} Assignments result
 */
export const getCaseAssignments = async (caseId) => {
  try {
    const { data, error } = await supabase
      .from('case_assignments')
      .select(`
        *,
        helper:profiles!helper_id(id, name, phone, user_type, email)
      `)
      .eq('case_id', caseId)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Get case assignments error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      assignments: data || [],
    };
  } catch (error) {
    console.error('Get case assignments exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch case assignments',
    };
  }
};

/**
 * Archive a resolved case
 * @param {string} caseId - Case ID
 * @returns {Promise<Object>} Archive result
 */
export const archiveCase = async (caseId) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .update({
        status: 'closed',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', caseId)
      .select()
      .single();

    if (error) {
      console.error('Archive case error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      case: data,
    };
  } catch (error) {
    console.error('Archive case exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to archive case',
    };
  }
};

/**
 * Trigger case workflow (calls edge function)
 * Note: This is optional - if edge function is not deployed, it will fail gracefully
 * @param {string} caseId - Case ID
 * @returns {Promise<Object>} Workflow result
 */
export const triggerCaseWorkflow = async (caseId) => {
  try {
    const { data, error } = await supabase.functions.invoke('case-workflow', {
      body: { caseId },
    });

    if (error) {
      console.warn('Trigger workflow error (edge function may not be deployed):', error.message);
      return {
        success: false,
        error: error.message,
        fallback: true, // Indicates caller should use fallback method
      };
    }

    return {
      success: true,
      result: data,
    };
  } catch (error) {
    console.warn('Trigger workflow exception (edge function may not be deployed):', error.message);
    return {
      success: false,
      error: error.message || 'Failed to trigger workflow',
      fallback: true, // Indicates caller should use fallback method
    };
  }
};

/**
 * Find and match helpers for a case using location-based matching
 * @param {string} caseId - Case ID
 * @param {Object} options - Matching options
 * @param {number} options.radiusKm - Search radius in kilometers
 * @param {string} options.urgencyLevel - Case urgency level
 * @param {string} options.animalType - Animal type
 * @param {Array<string>} options.preferredHelperTypes - Preferred helper types
 * @returns {Promise<Object>} Matching result
 */
export const findHelpersForCase = async (caseId, options = {}) => {
  try {
    // Get case details first
    const caseResult = await getCaseById(caseId);
    if (!caseResult.success || !caseResult.case) {
      return {
        success: false,
        error: 'Case not found',
      };
    }

    const caseData = caseResult.case;
    
    // Extract coordinates from location
    if (!caseData.location?.coordinates) {
      return {
        success: false,
        error: 'Case location coordinates not available',
      };
    }

    const [lng, lat] = caseData.location.coordinates;

    // Use location matching edge function with business logic
    const matchResult = await matchHelpersWithBusinessLogic({
      caseId,
      latitude: lat,
      longitude: lng,
      radiusKm: options.radiusKm || 10,
      urgencyLevel: options.urgencyLevel || caseData.urgencyLevel || 'medium',
      animalType: options.animalType || caseData.animalType,
      preferredHelperTypes: options.preferredHelperTypes,
    });

    return {
      success: true,
      ...matchResult,
    };
  } catch (error) {
    console.error('Find helpers for case exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to find helpers',
    };
  }
};

/**
 * Create case and automatically find nearby helpers
 * @param {Object} caseData - Case data
 * @param {Object} matchOptions - Helper matching options
 * @returns {Promise<Object>} Create and match result
 */
export const createCaseWithMatching = async (caseData, matchOptions = {}) => {
  try {
    // Create the case first
    const createResult = await createCase(caseData);
    if (!createResult.success) {
      return createResult;
    }

    const newCase = createResult.case;

    // Find nearby helpers
    const matchResult = await findHelpersForCase(newCase.id, matchOptions);

    return {
      success: true,
      case: newCase,
      helpers: matchResult.matchedHelpers || [],
      coverageStats: matchResult.coverageStats,
      recommendations: matchResult.recommendations,
    };
  } catch (error) {
    console.error('Create case with matching exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to create case with matching',
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
  searchCases,
  assignHelper,
  acceptAssignment,
  getHelperAssignments,
  getCaseAssignments,
  archiveCase,
  triggerCaseWorkflow,
  findHelpersForCase,
  createCaseWithMatching,
};
