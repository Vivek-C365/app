/**
 * @fileoverview Redis configuration and connection
 * Sets up Redis client for caching and session management
 */

const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

/**
 * Connect to Redis server
 * @returns {Promise<Object>} Redis client instance
 */
async function connectRedis() {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection attempts exceeded');
            return new Error('Redis reconnection failed');
          }
          return retries * 100; // Exponential backoff
        }
      }
    });
    
    // Event handlers
    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });
    
    redisClient.on('connect', () => {
      logger.info('Redis client connecting...');
    });
    
    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });
    
    redisClient.on('reconnecting', () => {
      logger.warn('Redis client reconnecting...');
    });
    
    redisClient.on('end', () => {
      logger.info('Redis client connection closed');
    });
    
    // Connect to Redis
    await redisClient.connect();
    
    return redisClient;
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
}

/**
 * Get Redis client instance
 * @returns {Object} Redis client
 */
function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
}

/**
 * Close Redis connection
 * @returns {Promise<void>}
 */
async function closeRedis() {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    throw error;
  }
}

/**
 * Cache helper functions
 */
const cache = {
  /**
   * Set a value in cache with optional expiration
   * @param {string} key - Cache key
   * @param {*} value - Value to cache (will be JSON stringified)
   * @param {number} [expirationSeconds] - Optional expiration in seconds
   * @returns {Promise<void>}
   */
  async set(key, value, expirationSeconds) {
    const client = getRedisClient();
    const stringValue = JSON.stringify(value);
    
    if (expirationSeconds) {
      await client.setEx(key, expirationSeconds, stringValue);
    } else {
      await client.set(key, stringValue);
    }
  },
  
  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<*>} Parsed value or null if not found
   */
  async get(key) {
    const client = getRedisClient();
    const value = await client.get(key);
    
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch (error) {
      logger.error('Error parsing cached value:', error);
      return value;
    }
  },
  
  /**
   * Delete a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<number>} Number of keys deleted
   */
  async del(key) {
    const client = getRedisClient();
    return await client.del(key);
  },
  
  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    const client = getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  },
  
  /**
   * Set expiration on a key
   * @param {string} key - Cache key
   * @param {number} seconds - Expiration in seconds
   * @returns {Promise<boolean>}
   */
  async expire(key, seconds) {
    const client = getRedisClient();
    const result = await client.expire(key, seconds);
    return result === 1;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  closeRedis,
  cache
};
