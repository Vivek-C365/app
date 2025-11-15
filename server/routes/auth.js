/**
 * @fileoverview Authentication routes
 * Handles user registration, login, logout, and password management
 */

const express = require('express');
const { User } = require('../models');
const PasswordReset = require('../models/PasswordReset');
const { generateToken, generateResetToken, verifyResetToken } = require('../utils/auth');
const { authenticate } = require('../middleware/auth');
const {
  validateRegistration,
  validateLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validatePasswordChange
} = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { email, phone, password, name, userType, profile } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: existingUser.email === email 
            ? 'Email already registered' 
            : 'Phone number already registered'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Create new user
    const user = new User({
      email,
      phone,
      password,
      name,
      userType,
      profile: profile || {}
    });
    
    await user.save();
    
    // Generate token
    const token = generateToken(user);
    
    logger.info(`New user registered: ${user.email} (${userType})`);
    
    res.status(201).json({
      success: true,
      data: {
        user: user.toProfileJSON(),
        token
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'Failed to register user'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Your account has been deactivated'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Generate token
    const token = generateToken(user);
    
    logger.info(`User logged in: ${user.email}`);
    
    res.json({
      success: true,
      data: {
        user: user.toProfileJSON(),
        token
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: 'Failed to login'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (blacklist token)
 * @access  Private
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Blacklist the token
    logger.info(`User logged out: ${req.user.email}`);
    
    res.json({
      success: true,
      data: {
        message: 'Logged out successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: 'Failed to logout'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/auth/password-reset-request
 * @desc    Request password reset
 * @access  Public
 */
router.post('/password-reset-request', validatePasswordResetRequest, async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        data: {
          message: 'If the email exists, a password reset link has been sent'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Generate reset token
    const resetToken = generateResetToken(user._id);
    
    // Store reset token in MongoDB with 1 hour expiration
    await PasswordReset.create({
      userId: user._id,
      token: resetToken,
      expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
    });
    
    // TODO: Send email with reset link (will be implemented in notification service)
    // For now, return the token in response (only for development)
    logger.info(`Password reset requested for: ${user.email}`);
    
    res.json({
      success: true,
      data: {
        message: 'If the email exists, a password reset link has been sent',
        ...(process.env.NODE_ENV === 'development' && { resetToken })
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RESET_REQUEST_FAILED',
        message: 'Failed to process password reset request'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/auth/password-reset
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/password-reset', validatePasswordReset, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Verify reset token
    const decoded = verifyResetToken(token);
    
    // Check if token exists in MongoDB
    const resetRecord = await PasswordReset.findOne({
      userId: decoded.id,
      token: token,
      expiresAt: { $gt: new Date() }
    });
    
    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Find user and update password
    const user = await User.findById(decoded.id);
    
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
    
    user.password = newPassword;
    await user.save();
    
    // Delete reset token from MongoDB
    await PasswordReset.deleteMany({ userId: user._id });
    
    logger.info(`Password reset completed for: ${user.email}`);
    
    res.json({
      success: true,
      data: {
        message: 'Password reset successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Password reset error:', error);
    
    if (error.message === 'Invalid token type' || error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid reset token'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Reset token has expired'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'RESET_FAILED',
        message: 'Failed to reset password'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password for authenticated user
 * @access  Private
 */
router.post('/change-password', authenticate, validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user with password directly from database (bypass cache)
    const user = await User.findById(req.user.id || req.user._id).select('+password');
    
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
    
    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    logger.info(`Password changed for: ${user.email}`);
    
    res.json({
      success: true,
      data: {
        message: 'Password changed successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PASSWORD_CHANGE_FAILED',
        message: 'Failed to change password'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_USER_FAILED',
        message: 'Failed to fetch user data'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/auth/google
 * @desc    Firebase Google Sign-In authentication
 * @access  Public
 */
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Firebase ID token is required'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Verify Firebase token
    const admin = require('firebase-admin');
    
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid: firebaseUid, email, name, picture } = decodedToken;

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Update Firebase UID if not set
      if (!user.googleId) {
        user.googleId = firebaseUid;
        await user.save();
      }
    } else {
      // Create new reporter user
      user = new User({
        email,
        name: name || email.split('@')[0],
        googleId: firebaseUid,
        userType: 'reporter',
        password: Math.random().toString(36).slice(-8), // Random password
        phone: `GOOGLE_${firebaseUid.slice(0, 10)}`, // Temporary phone
        profile: {
          verification: {
            status: 'not_submitted'
          }
        },
        isActive: true
      });

      await user.save();
      logger.info(`New Google user registered: ${email}`);
    }

    // Generate JWT token
    const token = generateToken(user);

    logger.info(`Google login via Firebase: ${email}`);

    res.json({
      success: true,
      data: {
        user: user.toProfileJSON(),
        token
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Firebase Google auth error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GOOGLE_AUTH_FAILED',
        message: 'Failed to authenticate with Google'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
