/**
 * @fileoverview Case model with location, photos, and status tracking
 * Handles animal rescue case lifecycle from creation to resolution
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Case schema for animal rescue cases
 */
const caseSchema = new Schema({
  reporterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  animalType: {
    type: String,
    required: true,
    enum: ['dog', 'cat', 'bird', 'cattle', 'wildlife', 'other'],
    trim: true
  },
  condition: {
    type: String,
    required: true,
    enum: ['injured', 'sick', 'trapped', 'abandoned', 'aggressive', 'other'],
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 2000
  },
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number] // [longitude, latitude]
    },
    address: {
      type: String,
      trim: true
    },
    landmarks: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 500
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    isApproximate: {
      type: Boolean,
      default: false
    },
    nearestKnownPlace: {
      type: String,
      trim: true,
      maxlength: 200
    },
    directions: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  photos: [{
    type: String,
    required: true
  }],
  contactInfo: {
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    }
  },
  status: {
    type: String,
    required: true,
    enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  assignedHelpers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastStatusUpdate: {
    type: Date,
    default: Date.now
  },
  nextReminderDue: {
    type: Date
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  urgencyLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  resolvedAt: {
    type: Date
  },
  aiAssistanceActivated: {
    type: Boolean,
    default: false
  },
  aiActivatedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Create indexes for efficient queries
caseSchema.index({ 'location.coordinates': '2dsphere' }); // Geospatial index
caseSchema.index({ status: 1, createdAt: -1 });
caseSchema.index({ reporterId: 1, createdAt: -1 });
caseSchema.index({ assignedHelpers: 1 });
caseSchema.index({ urgencyLevel: 1, status: 1 });
caseSchema.index({ nextReminderDue: 1, status: 1 });
caseSchema.index({ createdAt: -1 });

/**
 * Find cases near a location
 * @param {number[]} coordinates - [longitude, latitude]
 * @param {number} radiusInKm - Search radius in kilometers
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} Array of cases within radius
 */
caseSchema.statics.findNearby = async function(coordinates, radiusInKm, filters = {}) {
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
    ...filters
  };
  
  return this.find(query)
    .populate('reporterId', 'name phone email')
    .populate('assignedHelpers', 'name phone email userType profile.organization')
    .sort({ createdAt: -1 });
};

/**
 * Find cases requiring status update reminders
 * @returns {Promise<Array>} Array of cases needing reminders
 */
caseSchema.statics.findCasesNeedingReminders = async function() {
  const now = new Date();
  
  return this.find({
    status: { $in: ['assigned', 'in_progress'] },
    nextReminderDue: { $lte: now },
    reminderSent: false
  })
    .populate('assignedHelpers', 'name phone email notificationPreferences')
    .populate('reporterId', 'name phone email');
};

/**
 * Find cases with overdue status updates
 * @param {number} hoursOverdue - Hours since last update
 * @returns {Promise<Array>} Array of overdue cases
 */
caseSchema.statics.findOverdueCases = async function(hoursOverdue = 24) {
  const cutoffTime = new Date(Date.now() - hoursOverdue * 60 * 60 * 1000);
  
  return this.find({
    status: { $in: ['assigned', 'in_progress'] },
    lastStatusUpdate: { $lt: cutoffTime }
  })
    .populate('assignedHelpers', 'name phone email')
    .populate('reporterId', 'name phone email');
};

/**
 * Update case status and set reminder schedule
 * @param {string} newStatus - New status value
 * @returns {Promise<void>}
 */
caseSchema.methods.updateStatus = async function(newStatus) {
  this.status = newStatus;
  this.lastStatusUpdate = new Date();
  
  // Set next reminder for 24 hours if case is assigned or in progress
  if (newStatus === 'assigned' || newStatus === 'in_progress') {
    this.nextReminderDue = new Date(Date.now() + 24 * 60 * 60 * 1000);
    this.reminderSent = false;
  } else if (newStatus === 'resolved' || newStatus === 'closed') {
    this.resolvedAt = new Date();
    this.nextReminderDue = null;
  }
  
  await this.save();
};

/**
 * Assign helper to case
 * @param {ObjectId} helperId - ID of helper to assign
 * @returns {Promise<void>}
 */
caseSchema.methods.assignHelper = async function(helperId) {
  if (!this.assignedHelpers.includes(helperId)) {
    this.assignedHelpers.push(helperId);
    
    // Update status to assigned if it was open
    if (this.status === 'open') {
      await this.updateStatus('assigned');
    } else {
      await this.save();
    }
  }
};

/**
 * Calculate distance from a point to case location
 * @param {number[]} coordinates - [longitude, latitude]
 * @returns {number} Distance in kilometers
 */
caseSchema.methods.distanceFrom = function(coordinates) {
  if (!this.location.coordinates || this.location.coordinates.length !== 2) {
    return null;
  }
  
  const [lon1, lat1] = coordinates;
  const [lon2, lat2] = this.location.coordinates;
  
  // Haversine formula
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

const Case = mongoose.model('Case', caseSchema);

module.exports = Case;
