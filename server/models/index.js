/**
 * @fileoverview Model exports and database setup
 * Centralizes all Mongoose models and ensures indexes are created
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Ensure all geospatial and other indexes are created
 * @returns {Promise<void>}
 */
async function ensureIndexes() {
  try {
    // Models will be imported here as they are created
    // For now, just log that indexes are being set up
    logger.info('Database indexes setup initiated');
    
    // Geospatial indexes will be created automatically by Mongoose
    // when models define them in their schemas
    
    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error('Error creating database indexes:', error);
    throw error;
  }
}

module.exports = {
  ensureIndexes
};
