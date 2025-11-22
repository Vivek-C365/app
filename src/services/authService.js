/**
 * @fileoverview Authentication Service using Supabase Auth
 * Handles user authentication, registration, and session management
 */
import { supabase } from '../config/supabase';

/**
 * Sign up a new user with email and password
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password
 * @param {string} userData.name - User full name
 * @param {string} userData.phone - User phone number
 * @param {string} userData.userType - User type (reporter, volunteer, ngo)
 * @param {string} [userData.organization] - Organization name (for NGOs)
 * @returns {Promise<Object>} Sign up result with user data
 */
export const signUp = async (userData) => {
  try {
    const { email, password, name, phone, userType, organization } = userData;

    // Create user metadata to be stored in auth.users
    const metadata = {
      name,
      phone,
      user_type: userType,
    };

    if (organization) {
      metadata.organization = organization;
    }

    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      console.error('Sign up error:', error);
      
      // Handle rate limiting with user-friendly message
      if (error.message.includes('request this after')) {
        return {
          success: false,
          error: 'Too many signup attempts. Please wait a minute and try again.',
          isRateLimit: true,
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      return {
        success: true,
        requiresEmailConfirmation: true,
        user: data.user,
        message: 'Please check your email to confirm your account',
      };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (error) {
    console.error('Sign up exception:', error);
    return {
      success: false,
      error: error.message || 'An error occurred during sign up',
    };
  }
};

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Sign in result with session data
 */
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (error) {
    console.error('Sign in exception:', error);
    return {
      success: false,
      error: error.message || 'An error occurred during sign in',
    };
  }
};

/**
 * Sign in with magic link (passwordless)
 * @param {string} email - User email
 * @returns {Promise<Object>} Magic link result
 */
export const signInWithMagicLink = async (email) => {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // Only allow existing users
      },
    });

    if (error) {
      console.error('Magic link error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Check your email for the magic link',
    };
  } catch (error) {
    console.error('Magic link exception:', error);
    return {
      success: false,
      error: error.message || 'An error occurred sending magic link',
    };
  }
};

/**
 * Sign out the current user
 * @returns {Promise<Object>} Sign out result
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Sign out exception:', error);
    return {
      success: false,
      error: error.message || 'An error occurred during sign out',
    };
  }
};

/**
 * Get the current user session
 * @returns {Promise<Object|null>} Current session or null
 */
export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Get session error:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Get session exception:', error);
    return null;
  }
};

/**
 * Get the current user
 * @returns {Promise<Object|null>} Current user or null
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Get user error:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Get user exception:', error);
    return null;
  }
};

/**
 * Request password reset email
 * @param {string} email - User email
 * @returns {Promise<Object>} Password reset result
 */
export const resetPassword = async (email) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'animalrescue://reset-password',
    });

    if (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Password reset email sent',
    };
  } catch (error) {
    console.error('Password reset exception:', error);
    return {
      success: false,
      error: error.message || 'An error occurred requesting password reset',
    };
  }
};

/**
 * Update user password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Update password result
 */
export const updatePassword = async (newPassword) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('Update password error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    console.error('Update password exception:', error);
    return {
      success: false,
      error: error.message || 'An error occurred updating password',
    };
  }
};

/**
 * Get user profile from profiles table
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User profile or null
 */
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Get profile error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Get profile exception:', error);
    return null;
  }
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object>} Update result
 */
export const updateUserProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      profile: data,
    };
  } catch (error) {
    console.error('Update profile exception:', error);
    return {
      success: false,
      error: error.message || 'An error occurred updating profile',
    };
  }
};

/**
 * Refresh the current session
 * @returns {Promise<Object>} Refresh result
 */
export const refreshSession = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      // Don't log "Auth session missing" as an error - it's expected when not logged in
      if (error.message !== 'Auth session missing!') {
        console.error('Refresh session error:', error);
      }
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      session: data.session,
    };
  } catch (error) {
    console.error('Refresh session exception:', error);
    return {
      success: false,
      error: error.message || 'An error occurred refreshing session',
    };
  }
};

/**
 * Set up auth state change listener
 * @param {Function} callback - Callback function to handle auth state changes
 * @returns {Object} Subscription object with unsubscribe method
 */
export const onAuthStateChange = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      callback(event, session);
    }
  );

  return subscription;
};

export default {
  signUp,
  signIn,
  signInWithMagicLink,
  signOut,
  getSession,
  getCurrentUser,
  resetPassword,
  updatePassword,
  getUserProfile,
  updateUserProfile,
  refreshSession,
  onAuthStateChange,
};
