/**
 * @fileoverview JWT and authentication utilities
 * Handles token generation, verification, and password utilities
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('./logger');

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function generateToken(user) {
  const payload = {
    id: user._id,
    email: user.email,
    userType: user.userType
  };
  
  const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyToken(token) {
  try {
    const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    return jwt.verify(token, secret);
  } catch (error) {
    logger.error('Token verification failed:', error.message);
    throw error;
  }
}

/**
 * Hash password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate password reset token
 * @param {string} userId - User ID
 * @returns {string} Reset token
 */
function generateResetToken(userId) {
  const payload = {
    id: userId,
    type: 'password-reset'
  };
  
  const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  const expiresIn = '1h'; // Reset tokens expire in 1 hour
  
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verify password reset token
 * @param {string} token - Reset token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyResetToken(token) {
  try {
    const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    const decoded = jwt.verify(token, secret);
    
    if (decoded.type !== 'password-reset') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    logger.error('Reset token verification failed:', error.message);
    throw error;
  }
}

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  generateResetToken,
  verifyResetToken
};
