/**
 * @fileoverview ServiceArea model for helper coverage zones
 * Handles geographic service areas for volunteers and NGOs
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * ServiceArea schema for defining helper coverage zones
 */
const serviceAreaSchema = new Schema({
  helperId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: 'Invalid coordinates. Must be [longitude, latitude] within valid ranges'
      }
    },
    radius: {
      type: Number,
      required: true,
      min: 1,
      max: 100, // Maximum 100km radius
      default: 10
    }
  },
  city: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  state: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
serviceAreaSchema.index({ 'location.coordinates': '2dsphere' });
serviceAreaSchema.index({ helperId: 1, isActive: 1 });
serviceAreaSchema.index({ city: 1, state: 1 });

/**
 * Find service areas covering a location
 * @param {number[]} coordinates - [longitude, latitude]
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} Array of service areas covering the location
 */
serviceAreaSchema.statics.findCoveringLocation = async function(coordinates, filters = {}) {
  // Find service areas where the point is within the radius
  const serviceAreas = await this.find({
    isActive: true,
    ...filters
  }).populate('helperId', 'name phone email userType profile');
  
  // Filter by distance manually since we need to check radius
  const coveringAreas = serviceAreas.filter(area => {
    const distance = this.calculateDistance(
      coordinates,
      area.location.coordinates
    );
    return distance <= area.location.radius;
  });
  
  return coveringAreas;
};

/**
 * Find helpers covering a specific location
 * @param {number[]} coordinates - [longitude, latitude]
 * @param {Object} helperFilters - Filters for helper users
 * @returns {Promise<Array>} Array of helpers covering the location
 */
serviceAreaSchema.statics.findHelpersCoveringLocation = async function(coordinates, helperFilters = {}) {
  const serviceAreas = await this.findCoveringLocation(coordinates);
  
  // Get unique helper IDs
  const helperIds = [...new Set(serviceAreas.map(area => area.helperId._id))];
  
  // Return populated helpers
  const User = mongoose.model('User');
  return User.find({
    _id: { $in: helperIds },
    'profile.verification.status': 'approved',
    isActive: true,
    ...helperFilters
  });
};

/**
 * Get all service areas for a helper
 * @param {ObjectId} helperId - Helper user ID
 * @param {boolean} activeOnly - Return only active areas
 * @returns {Promise<Array>} Array of service areas
 */
serviceAreaSchema.statics.getByHelper = async function(helperId, activeOnly = true) {
  const query = { helperId };
  if (activeOnly) {
    query.isActive = true;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Get service areas by city and state
 * @param {string} city - City name
 * @param {string} state - State name
 * @returns {Promise<Array>} Array of service areas
 */
serviceAreaSchema.statics.getByLocation = async function(city, state) {
  return this.find({
    city: new RegExp(city, 'i'),
    state: new RegExp(state, 'i'),
    isActive: true
  }).populate('helperId', 'name phone email userType profile');
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number[]} coords1 - [longitude, latitude]
 * @param {number[]} coords2 - [longitude, latitude]
 * @returns {number} Distance in kilometers
 */
serviceAreaSchema.statics.calculateDistance = function(coords1, coords2) {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

/**
 * Check if a location is within this service area
 * @param {number[]} coordinates - [longitude, latitude]
 * @returns {boolean} True if location is covered
 */
serviceAreaSchema.methods.coversLocation = function(coordinates) {
  const distance = this.constructor.calculateDistance(
    coordinates,
    this.location.coordinates
  );
  return distance <= this.location.radius;
};

/**
 * Update service area radius
 * @param {number} newRadius - New radius in kilometers
 * @returns {Promise<void>}
 */
serviceAreaSchema.methods.updateRadius = async function(newRadius) {
  if (newRadius < 1 || newRadius > 100) {
    throw new Error('Radius must be between 1 and 100 kilometers');
  }
  
  this.location.radius = newRadius;
  await this.save();
};

/**
 * Deactivate service area
 * @returns {Promise<void>}
 */
serviceAreaSchema.methods.deactivate = async function() {
  this.isActive = false;
  await this.save();
};

/**
 * Activate service area
 * @returns {Promise<void>}
 */
serviceAreaSchema.methods.activate = async function() {
  this.isActive = true;
  await this.save();
};

const ServiceArea = mongoose.model('ServiceArea', serviceAreaSchema);

module.exports = ServiceArea;
