/**
 * @fileoverview Messages routes
 * Handles real-time messaging for case communications
 */

const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Case = require('../models/Case');
const { optionalAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * @route   GET /api/messages/:caseId
 * @desc    Get all messages for a case
 * @access  Public
 */
router.get('/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    // Verify case exists
    const caseItem = await Case.findById(caseId);
    if (!caseItem) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Case not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    const messages = await Message.getMessagesForCase(caseId, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Oldest first for chat display
        count: messages.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch messages'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/messages/:caseId
 * @desc    Send a message in a case
 * @access  Public (with optional auth)
 */
router.post('/:caseId',
  optionalAuth,
  [
    body('content').isLength({ min: 1, max: 2000 }).withMessage('Message content is required'),
    body('messageType').optional().isIn(['text', 'status_update', 'system', 'image']).withMessage('Invalid message type'),
    body('priority').optional().isIn(['normal', 'urgent']).withMessage('Invalid priority'),
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          },
          timestamp: new Date().toISOString()
        });
      }

      const { caseId } = req.params;
      const { content, messageType = 'text', priority = 'normal', imageUrl } = req.body;

      // Verify case exists
      const caseItem = await Case.findById(caseId);
      if (!caseItem) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Case not found'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Create message
      const message = new Message({
        caseId,
        senderId: req.user?._id || req.user?.id || null,
        content,
        messageType,
        priority,
        imageUrl
      });

      await message.save();

      // Populate sender info
      await message.populate('senderId', 'name userType profile.organization');

      logger.info(`New message in case ${caseItem.caseId}`);

      // TODO: Emit socket event for real-time update
      // TODO: Send push notifications to case participants

      res.status(201).json({
        success: true,
        data: message,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to send message'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route   POST /api/messages/:caseId/mark-read
 * @desc    Mark all messages in a case as read
 * @access  Public (with optional auth)
 */
router.post('/:caseId/mark-read', optionalAuth, async (req, res) => {
  try {
    const { caseId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
    }

    const userId = req.user._id || req.user.id;

    await Message.markAllAsRead(caseId, userId);

    res.json({
      success: true,
      message: 'Messages marked as read',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark messages as read'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/messages/:caseId/unread-count
 * @desc    Get unread message count for a user in a case
 * @access  Public (with optional auth)
 */
router.get('/:caseId/unread-count', optionalAuth, async (req, res) => {
  try {
    const { caseId } = req.params;

    if (!req.user) {
      return res.json({
        success: true,
        data: { count: 0 },
        timestamp: new Date().toISOString()
      });
    }

    const userId = req.user._id || req.user.id;
    const count = await Message.getUnreadCount(caseId, userId);

    res.json({
      success: true,
      data: { count },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get unread count'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
