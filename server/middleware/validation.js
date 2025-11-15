/**
 * @fileoverview Input validation middleware
 * Provides validation functions for request data
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
          value: err.value
        }))
      },
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}

/**
 * Validation rules for user registration
 */
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('userType')
    .isIn(['reporter', 'volunteer', 'ngo'])
    .withMessage('User type must be reporter, volunteer, or ngo'),
  body('profile.organization')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Organization name must not exceed 200 characters'),
  handleValidationErrors
];

/**
 * Validation rules for user login
 */
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Validation rules for profile update
 */
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  body('profile.organization')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Organization name must not exceed 200 characters'),
  body('profile.animalTypes')
    .optional()
    .isArray()
    .withMessage('Animal types must be an array'),
  body('profile.animalTypes.*')
    .optional()
    .isIn(['dog', 'cat', 'bird', 'cattle', 'wildlife', 'other'])
    .withMessage('Invalid animal type'),
  body('notificationPreferences.whatsapp')
    .optional()
    .isBoolean()
    .withMessage('WhatsApp preference must be a boolean'),
  body('notificationPreferences.email')
    .optional()
    .isBoolean()
    .withMessage('Email preference must be a boolean'),
  body('notificationPreferences.push')
    .optional()
    .isBoolean()
    .withMessage('Push preference must be a boolean'),
  body('notificationPreferences.radius')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Notification radius must be between 1 and 50 km'),
  handleValidationErrors
];

/**
 * Validation rules for password reset request
 */
const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  handleValidationErrors
];

/**
 * Validation rules for password reset
 */
const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

/**
 * Validation rules for password change
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validatePasswordResetRequest,
  validatePasswordReset,
  validatePasswordChange
};
