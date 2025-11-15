/**
 * @fileoverview Authentication middleware
 * Handles JWT token validation and user authorization
 */

const { verifyToken } = require('../utils/auth');
const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * Authenticate user from JWT token
 * Extracts token from Authorization header and validates it
 */
async function authenticate(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No authentication token provided'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Check if token is blacklisted (for logout functionality)
    const isBlacklisted = await cache.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_REVOKED',
          message: 'Token has been revoked'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Try to get user from cache first
    const cacheKey = `user:${decoded.id}`;
    let user = await cache.get(cacheKey);
    
    if (!user) {
      // Get user from database
      user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // Cache user profile for 5 minutes
      await cache.set(cacheKey, user.toProfileJSON(), 300);
      user = user.toProfileJSON();
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Attach user to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      },
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Authorize user based on user types
 * @param {...string} allowedTypes - Allowed user types
 * @returns {Function} Express middleware
 */
function authorize(...allowedTypes) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'User not authenticated'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    if (!allowedTypes.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to access this resource'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
}

/**
 * Optional authentication - attaches user if token is valid but doesn't require it
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    // Check if token is blacklisted
    const isBlacklisted = await cache.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return next();
    }
    
    // Try to get user from cache
    const cacheKey = `user:${decoded.id}`;
    let user = await cache.get(cacheKey);
    
    if (!user) {
      user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) {
        await cache.set(cacheKey, user, 300);
      }
    }
    
    if (user && user.isActive) {
      req.user = user;
      req.token = token;
    }
    
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};
