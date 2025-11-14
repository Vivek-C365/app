/**
 * @fileoverview User model with verification fields and notification preferences
 * Handles user authentication, profile management, and service area definitions
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

/**
 * Service Area subdocument schema
 */
const serviceAreaSchema = new Schema({
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  radius: {
    type: Number,
    required: true,
    min: 1,
    max: 100 // Maximum 100km radius
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: true });

// Create geospatial index on service area location
serviceAreaSchema.index({ location: '2dsphere' });

/**
 * User schema with verification and notification preferences
 */
const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    index: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false // Don't include password in queries by default
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  userType: {
    type: String,
    required: true,
    enum: ['reporter', 'volunteer', 'ngo', 'admin'],
    default: 'reporter'
  },
  profile: {
    organization: {
      type: String,
      trim: true,
      maxlength: 200
    },
    serviceAreas: [serviceAreaSchema],
    animalTypes: [{
      type: String,
      enum: ['dog', 'cat', 'bird', 'cattle', 'wildlife', 'other'],
      trim: true
    }],
    verification: {
      status: {
        type: String,
        enum: ['not_submitted', 'pending', 'approved', 'rejected'],
        default: 'not_submitted'
      },
      documents: {
        ngoRegistration: [String], // Array of document URLs
        ngoLocation: String, // Location proof document URL
        governmentId: String, // Government ID URL
        photo: String // Profile photo URL
      },
      submittedAt: Date,
      reviewedAt: Date,
      reviewNotes: String
    }
  },
  notificationPreferences: {
    whatsapp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    radius: {
      type: Number,
      default: 10, // Default 10km notification radius
      min: 1,
      max: 50
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number] // [longitude, latitude]
    },
    lastUpdated: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create indexes
userSchema.index({ userType: 1 });
userSchema.index({ 'profile.verification.status': 1 });
userSchema.index({ location: '2dsphere' }); // Geospatial index for user location
userSchema.index({ isActive: 1 });

/**
 * Hash password before saving
 */
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare password for authentication
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} True if password matches
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

/**
 * Get user profile without sensitive data
 * @returns {Object} User profile object
 */
userSchema.methods.toProfileJSON = function() {
  return {
    id: this._id,
    email: this.email,
    phone: this.phone,
    name: this.name,
    userType: this.userType,
    profile: this.profile,
    notificationPreferences: this.notificationPreferences,
    location: this.location,
    isActive: this.isActive,
    createdAt: this.createdAt
  };
};

/**
 * Find users within a radius of a location
 * @param {number[]} coordinates - [longitude, latitude]
 * @param {number} radiusInKm - Search radius in kilometers
 * @param {Object} filters - Additional filters (userType, verification status, etc.)
 * @returns {Promise<Array>} Array of users within radius
 */
userSchema.statics.findNearby = async function(coordinates, radiusInKm, filters = {}) {
  const query = {
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: radiusInKm * 1000 // Convert km to meters
      }
    },
    isActive: true,
    ...filters
  };
  
  return this.find(query);
};

/**
 * Find helpers (volunteers and NGOs) with service areas covering a location
 * @param {number[]} coordinates - [longitude, latitude]
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} Array of helpers covering the location
 */
userSchema.statics.findHelpersByServiceArea = async function(coordinates, filters = {}) {
  const query = {
    userType: { $in: ['volunteer', 'ngo'] },
    'profile.verification.status': 'approved',
    'profile.serviceAreas.location': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        }
      }
    },
    'profile.serviceAreas.isActive': true,
    isActive: true,
    ...filters
  };
  
  return this.find(query);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
