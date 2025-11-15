/**
 * @fileoverview Model exports and database setup
 * Centralizes all Mongoose models and ensures indexes are created
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Import all models
const User = require('./User');
const Case = require('./Case');
const Message = require('./Message');
const StatusUpdate = require('./StatusUpdate');
const ServiceArea = require('./ServiceArea');

/**
 * Ensure all geospatial and other indexes are created
 * @returns {Promise<void>}
 */
async function ensureIndexes() {
  try {
    logger.info('Database indexes setup initiated');
    
    // Create indexes for all models
    await Promise.all([
      User.createIndexes(),
      Case.createIndexes(),
      Message.createIndexes(),
      StatusUpdate.createIndexes(),
      ServiceArea.createIndexes()
    ]);
    
    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error('Error creating database indexes:', error);
    throw error;
  }
}

module.exports = {
  User,
  Case,
  Message,
  StatusUpdate,
  ServiceArea,
  ensureIndexes
};
