/**
 * @fileoverview Message model for case communications
 * Handles real-time messaging between case participants
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Message schema for case communications
 */
const messageSchema = new Schema({
  caseId: {
    type: Schema.Types.ObjectId,
    ref: 'Case',
    required: true,
    index: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 2000
  },
  messageType: {
    type: String,
    required: true,
    enum: ['text', 'status_update', 'system', 'image'],
    default: 'text'
  },
  priority: {
    type: String,
    enum: ['normal', 'urgent'],
    default: 'normal',
    index: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  readBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Create compound indexes for efficient queries
messageSchema.index({ caseId: 1, timestamp: -1 });
messageSchema.index({ caseId: 1, priority: 1, timestamp: -1 });
messageSchema.index({ senderId: 1, timestamp: -1 });

/**
 * Get messages for a case
 * @param {ObjectId} caseId - Case ID
 * @param {Object} options - Query options (limit, skip, etc.)
 * @returns {Promise<Array>} Array of messages
 */
messageSchema.statics.getMessagesForCase = async function(caseId, options = {}) {
  const { limit = 50, skip = 0, priority = null } = options;
  
  const query = { caseId };
  if (priority) {
    query.priority = priority;
  }
  
  return this.find(query)
    .populate('senderId', 'name userType profile.organization')
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Get unread message count for a user in a case
 * @param {ObjectId} caseId - Case ID
 * @param {ObjectId} userId - User ID
 * @returns {Promise<number>} Count of unread messages
 */
messageSchema.statics.getUnreadCount = async function(caseId, userId) {
  return this.countDocuments({
    caseId,
    readBy: { $ne: userId },
    senderId: { $ne: userId } // Don't count own messages
  });
};

/**
 * Mark message as read by user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<void>}
 */
messageSchema.methods.markAsRead = async function(userId) {
  if (!this.readBy.includes(userId)) {
    this.readBy.push(userId);
    await this.save();
  }
};

/**
 * Mark all messages in a case as read by user
 * @param {ObjectId} caseId - Case ID
 * @param {ObjectId} userId - User ID
 * @returns {Promise<void>}
 */
messageSchema.statics.markAllAsRead = async function(caseId, userId) {
  await this.updateMany(
    {
      caseId,
      readBy: { $ne: userId },
      senderId: { $ne: userId }
    },
    {
      $addToSet: { readBy: userId }
    }
  );
};

/**
 * Get urgent messages for a case
 * @param {ObjectId} caseId - Case ID
 * @returns {Promise<Array>} Array of urgent messages
 */
messageSchema.statics.getUrgentMessages = async function(caseId) {
  return this.find({
    caseId,
    priority: 'urgent'
  })
    .populate('senderId', 'name userType profile.organization')
    .sort({ timestamp: -1 });
};

/**
 * Create system message
 * @param {ObjectId} caseId - Case ID
 * @param {string} content - Message content
 * @param {string} priority - Message priority
 * @returns {Promise<Message>} Created message
 */
messageSchema.statics.createSystemMessage = async function(caseId, content, priority = 'normal') {
  return this.create({
    caseId,
    senderId: null, // System messages have no sender
    content,
    messageType: 'system',
    priority
  });
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
