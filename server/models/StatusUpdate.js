/**
 * @fileoverview StatusUpdate model with mandatory photo requirements
 * Handles case status updates with photo validation and tracking
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * StatusUpdate schema for tracking case progress
 */
const statusUpdateSchema = new Schema({
  caseId: {
    type: Schema.Types.ObjectId,
    ref: 'Case',
    required: true,
    index: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  previousStatus: {
    type: String,
    required: true,
    enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed']
  },
  newStatus: {
    type: String,
    required: true,
    enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed']
  },
  condition: {
    type: String,
    required: true,
    enum: ['improving', 'stable', 'deteriorating', 'critical', 'recovered'],
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 50,
    maxlength: 2000
  },
  photos: {
    type: [String],
    required: true,
    validate: {
      validator: function(photos) {
        return photos && photos.length >= 2;
      },
      message: 'At least 2 photos are required for status updates'
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
    address: {
      type: String,
      trim: true
    }
  },
  treatmentProvided: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  nextSteps: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Create compound indexes for efficient queries
statusUpdateSchema.index({ caseId: 1, timestamp: -1 });
statusUpdateSchema.index({ updatedBy: 1, timestamp: -1 });
statusUpdateSchema.index({ caseId: 1, isScheduled: 1 });

/**
 * Get status update history for a case
 * @param {ObjectId} caseId - Case ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of status updates
 */
statusUpdateSchema.statics.getHistoryForCase = async function(caseId, options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  return this.find({ caseId })
    .populate('updatedBy', 'name userType profile.organization')
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Get latest status update for a case
 * @param {ObjectId} caseId - Case ID
 * @returns {Promise<StatusUpdate|null>} Latest status update or null
 */
statusUpdateSchema.statics.getLatestForCase = async function(caseId) {
  return this.findOne({ caseId })
    .populate('updatedBy', 'name userType profile.organization')
    .sort({ timestamp: -1 });
};

/**
 * Get scheduled (24-hour reminder) updates
 * @param {ObjectId} caseId - Case ID
 * @returns {Promise<Array>} Array of scheduled updates
 */
statusUpdateSchema.statics.getScheduledUpdates = async function(caseId) {
  return this.find({
    caseId,
    isScheduled: true
  })
    .populate('updatedBy', 'name userType profile.organization')
    .sort({ timestamp: -1 });
};

/**
 * Count updates by a helper for a case
 * @param {ObjectId} caseId - Case ID
 * @param {ObjectId} helperId - Helper user ID
 * @returns {Promise<number>} Count of updates
 */
statusUpdateSchema.statics.countByHelper = async function(caseId, helperId) {
  return this.countDocuments({
    caseId,
    updatedBy: helperId
  });
};

/**
 * Get updates showing improvement
 * @param {ObjectId} caseId - Case ID
 * @returns {Promise<Array>} Array of updates showing improvement
 */
statusUpdateSchema.statics.getImprovementUpdates = async function(caseId) {
  return this.find({
    caseId,
    condition: { $in: ['improving', 'recovered'] }
  })
    .populate('updatedBy', 'name userType profile.organization')
    .sort({ timestamp: -1 });
};

/**
 * Get critical condition updates
 * @param {ObjectId} caseId - Case ID
 * @returns {Promise<Array>} Array of critical updates
 */
statusUpdateSchema.statics.getCriticalUpdates = async function(caseId) {
  return this.find({
    caseId,
    condition: { $in: ['critical', 'deteriorating'] }
  })
    .populate('updatedBy', 'name userType profile.organization')
    .sort({ timestamp: -1 });
};

/**
 * Validate photo requirements before saving
 */
statusUpdateSchema.pre('save', function(next) {
  if (this.photos.length < 2) {
    return next(new Error('Status updates must include at least 2 photos'));
  }
  next();
});

/**
 * Create status update and update case
 * @param {Object} updateData - Status update data
 * @param {Object} caseDoc - Case document to update
 * @returns {Promise<StatusUpdate>} Created status update
 */
statusUpdateSchema.statics.createAndUpdateCase = async function(updateData, caseDoc) {
  const statusUpdate = await this.create(updateData);
  
  // Update the case document
  caseDoc.status = updateData.newStatus;
  caseDoc.lastStatusUpdate = new Date();
  
  // Set next reminder for 24 hours if case is still active
  if (updateData.newStatus === 'assigned' || updateData.newStatus === 'in_progress') {
    caseDoc.nextReminderDue = new Date(Date.now() + 24 * 60 * 60 * 1000);
    caseDoc.reminderSent = false;
  } else if (updateData.newStatus === 'resolved') {
    // Check if case requires reporter approval
    if (caseDoc.requiresReporterApproval) {
      // Keep status as in_progress and mark as pending reporter approval
      caseDoc.status = 'in_progress';
      caseDoc.pendingReporterApproval = true;
      caseDoc.resolvedAt = new Date();
      caseDoc.nextReminderDue = null;
    } else {
      // No approval needed, mark as closed directly
      caseDoc.status = 'closed';
      caseDoc.resolvedAt = new Date();
      caseDoc.nextReminderDue = null;
    }
  } else if (updateData.newStatus === 'closed') {
    caseDoc.resolvedAt = new Date();
    caseDoc.nextReminderDue = null;
    caseDoc.pendingReporterApproval = false;
  }
  
  await caseDoc.save();
  
  return statusUpdate;
};

const StatusUpdate = mongoose.model('StatusUpdate', statusUpdateSchema);

module.exports = StatusUpdate;
