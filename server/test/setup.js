/**
 * @fileoverview Test environment setup
 * Configures test database and environment variables
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = 3001;
process.env.MONGODB_URI = 'mongodb://localhost:27017/animal-rescue-test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

// Increase timeout for database operations
jest.setTimeout(10000);
