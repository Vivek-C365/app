/**
 * @fileoverview User management routes
 * Handles user profile management and preferences
 */

const express = require('express');
const { User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { validateProfileUpdate } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: {
        user: user.toProfileJSON()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_PROFILE_FAILED',
        message: 'Failed to fetch profile'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   PATCH /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.patch('/profile', authenticate, validateProfileUpdate, async (req, res) => {
  try {
    const updates = req.body;
    const userId = req.user.id || req.user._id;
    
    // Fields that can be updated
    const allowedUpdates = [
      'name',
      'phone',
      'profile.organization',
      'profile.animalTypes',
      'notificationPreferences'
    ];
    
    // Check if phone is being updated and if it's already taken
    if (updates.phone && updates.phone !== req.user.phone) {
      const existingUser = await User.findOne({ phone: updates.phone });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PHONE_EXISTS',
            message: 'Phone number already registered'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Build update object
    const updateObj = {};
    
    if (updates.name) updateObj.name = updates.name;
    if (updates.phone) updateObj.phone = updates.phone;
    
    if (updates.profile) {
      if (updates.profile.organization !== undefined) {
        updateObj['profile.organization'] = updates.profile.organization;
      }
      if (updates.profile.animalTypes) {
        updateObj['profile.animalTypes'] = updates.profile.animalTypes;
      }
    }
    
    if (updates.notificationPreferences) {
      if (updates.notificationPreferences.whatsapp !== undefined) {
        updateObj['notificationPreferences.whatsapp'] = updates.notificationPreferences.whatsapp;
      }
      if (updates.notificationPreferences.email !== undefined) {
        updateObj['notificationPreferences.email'] = updates.notificationPreferences.email;
      }
      if (updates.notificationPreferences.push !== undefined) {
        updateObj['notificationPreferences.push'] = updates.notificationPreferences.push;
      }
      if (updates.notificationPreferences.radius !== undefined) {
        updateObj['notificationPreferences.radius'] = updates.notificationPreferences.radius;
      }
    }
    
    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateObj },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Update cache
    await cache.set(`user:${userId}`, user.toProfileJSON(), 300);
    
    logger.info(`Profile updated for user: ${user.email}`);
    
    res.json({
      success: true,
      data: {
        user: user.toProfileJSON()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_PROFILE_FAILED',
        message: 'Failed to update profile'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   PATCH /api/users/location
 * @desc    Update user location
 * @access  Private
 */
router.patch('/location', authenticate, async (req, res) => {
  try {
    const { coordinates } = req.body;
    const userId = req.user.id || req.user._id;
    
    // Validate coordinates
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_COORDINATES',
          message: 'Coordinates must be an array of [longitude, latitude]'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const [longitude, latitude] = coordinates;
    
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_COORDINATES',
          message: 'Invalid coordinate values'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Update user location
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          location: {
            type: 'Point',
            coordinates: [longitude, latitude],
            lastUpdated: new Date()
          }
        }
      },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Update cache
    await cache.set(`user:${user._id}`, user.toProfileJSON(), 300);
    
    logger.info(`Location updated for user: ${user.email}`);
    
    res.json({
      success: true,
      data: {
        location: user.location
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Update location error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_LOCATION_FAILED',
        message: 'Failed to update location'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   DELETE /api/users/account
 * @desc    Deactivate user account
 * @access  Private
 */
router.delete('/account', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive: false } },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Clear user cache
    await cache.del(`user:${user._id}`);
    
    // Blacklist current token
    const expiresIn = 7 * 24 * 60 * 60;
    await cache.set(`blacklist:${req.token}`, true, expiresIn);
    
    logger.info(`Account deactivated for user: ${user.email}`);
    
    res.json({
      success: true,
      data: {
        message: 'Account deactivated successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Deactivate account error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DEACTIVATE_FAILED',
        message: 'Failed to deactivate account'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (public profile)
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Return limited public profile
    const publicProfile = {
      id: user._id,
      name: user.name,
      userType: user.userType,
      profile: {
        organization: user.profile.organization,
        verification: {
          status: user.profile.verification.status
        }
      },
      createdAt: user.createdAt
    };
    
    res.json({
      success: true,
      data: {
        user: publicProfile
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_USER_FAILED',
        message: 'Failed to fetch user'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
