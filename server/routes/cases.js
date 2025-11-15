/**
 * @fileoverview Cases routes
 * Handles animal rescue case creation, retrieval, and management
 */

const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * @route   POST /api/cases
 * @desc    Create a new animal rescue case
 * @access  Public (for now, can be protected later)
 */
router.post('/',
  optionalAuth,
  [
    body('animalType').isIn(['dog', 'cat', 'bird', 'cattle', 'wildlife', 'other', 'cow']).withMessage('Invalid animal type'),
    body('condition').isIn(['injured', 'sick', 'trapped', 'abandoned', 'aggressive', 'other', 'lost', 'starving']).withMessage('Invalid condition'),
    body('description').isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
    body('location.address').notEmpty().withMessage('Location address is required'),
    body('contactInfo.phone').matches(/^[+]?[\d\s-]{10,}$/).withMessage('Valid phone number is required'),
    body('contactInfo.email').optional().isEmail().withMessage('Valid email is required'),
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

      const { animalType, condition, description, location, photos, contactInfo, requiresReporterApproval } = req.body;

      // Map mobile app values to database enum values
      const animalTypeMap = {
        'cow': 'cattle',
        'dog': 'dog',
        'cat': 'cat',
        'bird': 'bird',
        'other': 'other'
      };

      const conditionMap = {
        'injured': 'injured',
        'sick': 'sick',
        'trapped': 'trapped',
        'lost': 'abandoned',
        'aggressive': 'aggressive',
        'starving': 'other'
      };

      // Extract photo URIs from photo objects
      const photoUris = Array.isArray(photos) 
        ? photos.map(photo => typeof photo === 'string' ? photo : photo.uri).filter(Boolean)
        : [];

      // Create case data
      const reporterId = req.user?._id || req.user?.id || null;
      logger.info(`Creating case with reporterId: ${reporterId}, user: ${JSON.stringify(req.user)}`);
      
      const caseData = {
        reporterId: reporterId, // Will be null for unauthenticated users
        animalType: animalTypeMap[animalType] || 'other',
        condition: conditionMap[condition] || 'other',
        description,
        location: {
          type: 'Point',
          coordinates: location.coordinates || [],
          address: location.address,
          landmarks: location.landmarks || location.address,
          description: location.description || location.address,
          isApproximate: location.isApproximate !== false,
        },
        photos: photoUris,
        contactInfo: {
          phone: contactInfo.phone.replace(/[^\d]/g, '').slice(-10), // Extract last 10 digits
          email: contactInfo.email,
          name: contactInfo.name
        },
        status: 'open',
        urgencyLevel: condition === 'injured' || condition === 'trapped' ? 'high' : 'medium',
        requiresReporterApproval: requiresReporterApproval !== false // Default to true if not specified
      };

      // Create case
      const newCase = new Case(caseData);
      await newCase.save();

      logger.info(`New case created: ${newCase._id}`);

      // TODO: Notify nearby volunteers (implement in notification service)
      // TODO: Send confirmation to reporter

      res.status(201).json({
        success: true,
        data: {
          caseId: newCase.caseId,
          _id: newCase._id,
          status: newCase.status,
          createdAt: newCase.createdAt
        },
        message: 'Case created successfully. Nearby volunteers will be notified.',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error creating case:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create case. Please try again.',
          ...(process.env.NODE_ENV === 'development' && { details: error.message })
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route   GET /api/cases
 * @desc    Get all cases with optional filters
 * @access  Public (with optional authentication for myOnly filter)
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status, animalType, urgencyLevel, limit = 50, skip = 0, myOnly, reportedBy } = req.query;

    const query = {};
    
    // Handle comma-separated status values
    if (status) {
      const statusArray = status.split(',').map(s => s.trim());
      query.status = statusArray.length > 1 ? { $in: statusArray } : status;
    }
    
    if (animalType) query.animalType = animalType;
    if (urgencyLevel) query.urgencyLevel = urgencyLevel;
    
    // Filter by assigned helper if myOnly is true and user is authenticated
    if (myOnly === 'true' && req.user) {
      const userId = req.user.id || req.user._id;
      query.assignedHelpers = userId;
      logger.info(`Fetching cases for user: ${userId}, query: ${JSON.stringify(query)}`);
    }
    
    // Filter by reporter if reportedBy is provided and user is authenticated
    if (reportedBy && req.user) {
      const userId = req.user.id || req.user._id;
      const User = require('../models/User');
      const currentUser = await User.findById(userId);
      
      if (currentUser) {
        // Match by reporterId OR by contact info (phone/email) for cases created before auth
        query.$or = [
          { reporterId: userId },
          { 'contactInfo.phone': currentUser.phone },
          { 'contactInfo.email': currentUser.email }
        ];
        logger.info(`Fetching reported cases for user: ${userId}, phone: ${currentUser.phone}, email: ${currentUser.email}`);
      } else {
        query.reporterId = userId;
        logger.info(`Fetching reported cases for user: ${userId}, reporterId filter: ${userId}`);
      }
    } else if (reportedBy && !req.user) {
      logger.warn('Attempted to fetch reported cases without authentication');
    }

    const cases = await Case.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('reporterId', 'name phone email')
      .populate('assignedHelpers', 'name phone email userType');

    const total = await Case.countDocuments(query);

    res.json({
      success: true,
      data: {
        cases,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: total > parseInt(skip) + parseInt(limit)
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching cases:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch cases'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/cases/:id
 * @desc    Get a single case by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id)
      .populate('reporterId', 'name phone email')
      .populate('assignedHelpers', 'name phone email userType profile.organization');

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

    res.json({
      success: true,
      data: caseItem,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching case:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch case'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/cases/:id/timeline
 * @desc    Get timeline/history for a case
 * @access  Public
 */
router.get('/:id/timeline', async (req, res) => {
  try {
    const { StatusUpdate } = require('../models');
    const caseItem = await Case.findById(req.params.id)
      .populate('reporterId', 'name phone email userType')
      .populate('assignedHelpers', 'name phone email userType profile.organization');

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

    // Get status updates with populated user data
    const statusUpdates = await StatusUpdate.find({ caseId: req.params.id })
      .populate('updatedBy', 'name phone email userType profile.organization')
      .sort({ timestamp: -1 });

    // Build detailed timeline
    const timeline = [];

    // 1. Case Creation Event
    timeline.push({
      type: 'created',
      timestamp: caseItem.createdAt,
      status: 'open',
      title: 'Case Reported',
      description: `${caseItem.animalType.charAt(0).toUpperCase() + caseItem.animalType.slice(1)} in ${caseItem.condition} condition reported`,
      details: {
        animalType: caseItem.animalType,
        condition: caseItem.condition,
        urgencyLevel: caseItem.urgencyLevel,
        description: caseItem.description,
        location: caseItem.location.address || caseItem.location.landmarks,
        reporter: {
          name: caseItem.contactInfo?.name || 'Anonymous',
          phone: caseItem.contactInfo?.phone,
          email: caseItem.contactInfo?.email
        }
      },
      photos: caseItem.photos || [],
      photoCount: caseItem.photos?.length || 0
    });

    // 2. Assignment Events
    if (caseItem.assignedHelpers && caseItem.assignedHelpers.length > 0) {
      caseItem.assignedHelpers.forEach((helper, index) => {
        timeline.push({
          type: 'assigned',
          timestamp: caseItem.lastStatusUpdate,
          status: 'assigned',
          title: 'Helper Assigned',
          description: `${helper.name} accepted the case`,
          details: {
            helper: {
              name: helper.name,
              userType: helper.userType,
              organization: helper.profile?.organization,
              phone: helper.phone,
              email: helper.email
            }
          }
        });
      });
    }

    // 3. Status Update Events
    statusUpdates.forEach(update => {
      const updaterName = update.updatedBy?.name || 'Helper';
      const updaterOrg = update.updatedBy?.profile?.organization;
      
      timeline.push({
        type: 'status_update',
        timestamp: update.timestamp,
        status: update.newStatus,
        title: 'Status Update',
        description: update.description || `Case status updated to ${update.newStatus}`,
        details: {
          condition: update.condition,
          previousStatus: update.previousStatus,
          newStatus: update.newStatus,
          notes: update.notes,
          updatedBy: {
            name: updaterName,
            userType: update.updatedBy?.userType,
            organization: updaterOrg
          }
        },
        photos: update.photos || [],
        photoCount: update.photos?.length || 0
      });
    });

    // 4. AI Assistance Event
    if (caseItem.aiAssistanceActivated && caseItem.aiActivatedAt) {
      timeline.push({
        type: 'ai_activated',
        timestamp: caseItem.aiActivatedAt,
        status: caseItem.status,
        title: 'AI Assistance Activated',
        description: 'Emergency AI assistance was activated for this case',
        details: {
          reason: 'No volunteers responded within the required timeframe'
        }
      });
    }

    // 5. Resolution Event
    if (caseItem.resolvedAt) {
      timeline.push({
        type: 'resolved',
        timestamp: caseItem.resolvedAt,
        status: 'resolved',
        title: 'Case Resolved',
        description: 'Animal rescue case successfully resolved',
        details: {
          duration: Math.floor((new Date(caseItem.resolvedAt) - new Date(caseItem.createdAt)) / (1000 * 60 * 60)) + ' hours'
        }
      });
    }

    // Sort timeline by timestamp (newest first)
    timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: {
        caseId: caseItem.caseId,
        caseStatus: caseItem.status,
        totalEvents: timeline.length,
        timeline
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching case timeline:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch case timeline'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/cases/:id/assign
 * @desc    Assign a helper (volunteer/NGO) to a case
 * @access  Public (with optional auth to track assigned user)
 */
router.post('/:id/assign', optionalAuth, async (req, res) => {
  try {
    const { helperId, helperName, helperPhone, helperType } = req.body;

    const caseItem = await Case.findById(req.params.id);

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

    // Determine the helper ID to add
    const helperIdToAdd = req.user ? (req.user.id || req.user._id) : helperId;

    logger.info(`Assign case request - User: ${JSON.stringify(req.user)}, helperIdToAdd: ${helperIdToAdd}`);

    // Check if user is authenticated
    if (!helperIdToAdd) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'You must be logged in to accept a case'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Update status to assigned if it was open
    if (caseItem.status === 'open') {
      caseItem.status = 'assigned';
    }

    caseItem.lastStatusUpdate = new Date();
    
    // Build update query
    const updateData = { 
      $set: {
        status: caseItem.status,
        lastStatusUpdate: caseItem.lastStatusUpdate
      },
      $addToSet: { assignedHelpers: helperIdToAdd }
    };
    
    logger.info(`Adding helper ${helperIdToAdd} to case ${caseItem.caseId}`);
    
    // Use updateOne to bypass validation on unchanged fields
    const updateResult = await Case.updateOne(
      { _id: req.params.id },
      updateData
    );
    
    logger.info(`Case ${caseItem.caseId} assigned to helper ${helperIdToAdd || 'unknown'}. Modified: ${updateResult.modifiedCount}`);

    // Create a message to track the assignment in timeline
    if (helperIdToAdd) {
      try {
        const Message = require('../models/Message');
        const User = require('../models/User');
        
        const helper = await User.findById(helperIdToAdd);
        if (helper) {
          await Message.create({
            caseId: req.params.id,
            senderId: null, // System message
            content: `${helper.name} has been assigned to help with this case`,
            messageType: 'system',
            priority: 'normal'
          });
        }
      } catch (msgError) {
        logger.error('Error creating assignment message:', msgError);
        // Don't fail the assignment if message creation fails
      }
    }

    res.json({
      success: true,
      data: {
        caseId: caseItem.caseId,
        status: caseItem.status,
        message: 'You have been assigned to this case'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error assigning case:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to assign case'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/cases/:id/transfer
 * @desc    Transfer case to NGO when situation is out of control
 * @access  Public
 */
router.post('/:id/transfer', async (req, res) => {
  try {
    const { reason, ngoId, ngoName } = req.body;

    const caseItem = await Case.findById(req.params.id);

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

    // Mark as needing NGO assistance
    caseItem.urgencyLevel = 'critical';
    caseItem.status = 'open'; // Reopen for NGOs to pick up
    caseItem.lastStatusUpdate = new Date();
    
    // Add transfer note to description
    caseItem.description = `${caseItem.description}\n\n[TRANSFERRED] Reason: ${reason}`;

    await caseItem.save();

    logger.info(`Case ${caseItem.caseId} transferred for NGO assistance`);

    res.json({
      success: true,
      data: {
        caseId: caseItem.caseId,
        status: caseItem.status,
        urgencyLevel: caseItem.urgencyLevel,
        message: 'Case transferred successfully. Nearby NGOs will be notified.'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error transferring case:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to transfer case'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/cases/:id/status-update
 * @desc    Add a status update to a case (for assigned helpers)
 * @access  Public (with optional auth)
 */
router.post('/:id/status-update',
  optionalAuth,
  [
    body('condition').isIn(['improving', 'stable', 'deteriorating', 'critical', 'recovered']).withMessage('Invalid condition'),
    body('description').isLength({ min: 50, max: 2000 }).withMessage('Description must be between 50 and 2000 characters'),
    body('photos').isArray({ min: 2 }).withMessage('At least 2 photos are required'),
    body('newStatus').isIn(['assigned', 'in_progress', 'resolved', 'closed']).withMessage('Invalid status'),
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

      const { StatusUpdate } = require('../models');
      const caseItem = await Case.findById(req.params.id);

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

      const { condition, description, photos, newStatus, treatmentProvided, nextSteps, location } = req.body;

      // Create status update
      const updateData = {
        caseId: req.params.id,
        updatedBy: req.user?._id || req.user?.id,
        previousStatus: caseItem.status,
        newStatus,
        condition,
        description,
        photos,
        treatmentProvided,
        nextSteps,
        location
      };

      const statusUpdate = await StatusUpdate.createAndUpdateCase(updateData, caseItem);

      logger.info(`Status update added to case ${caseItem.caseId}`);

      res.status(201).json({
        success: true,
        data: statusUpdate,
        message: 'Status update added successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error adding status update:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to add status update'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route   POST /api/cases/:id/mark-resolved
 * @desc    Mark case as resolved (by NGO/helper)
 * @access  Private (requires authentication)
 */
router.post('/:id/mark-resolved', optionalAuth, async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);

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

    // Check if case requires reporter approval
    if (caseItem.requiresReporterApproval) {
      // Keep status as in_progress and mark as pending reporter approval
      caseItem.status = 'in_progress';
      caseItem.pendingReporterApproval = true;
      caseItem.resolvedAt = new Date();
      caseItem.lastStatusUpdate = new Date();
      
      await caseItem.save();
      
      logger.info(`Case ${caseItem.caseId} marked as pending reporter approval`);
      
      // TODO: Send notification to reporter for approval
      
      res.json({
        success: true,
        data: {
          caseId: caseItem.caseId,
          status: caseItem.status,
          pendingReporterApproval: true,
          message: 'Case marked as resolved. Waiting for reporter approval.'
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // No approval needed, mark as closed directly
      caseItem.status = 'closed';
      caseItem.resolvedAt = new Date();
      caseItem.lastStatusUpdate = new Date();
      caseItem.nextReminderDue = null;
      
      await caseItem.save();
      
      logger.info(`Case ${caseItem.caseId} marked as closed (no approval required)`);
      
      res.json({
        success: true,
        data: {
          caseId: caseItem.caseId,
          status: caseItem.status,
          message: 'Case successfully closed'
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    logger.error('Error marking case as resolved:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark case as resolved'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/cases/:id/reporter-approve
 * @desc    Reporter approves and closes the case
 * @access  Private (requires authentication - must be reporter)
 */
router.post('/:id/reporter-approve', optionalAuth, async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);

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

    // Verify user is the reporter
    const userId = req.user?.id || req.user?._id;
    const User = require('../models/User');
    const currentUser = await User.findById(userId);
    
    // Check if user is the reporter by ID or by contact info (for cases created before auth)
    let isReporter = false;
    
    if (caseItem.reporterId && caseItem.reporterId.toString() === userId?.toString()) {
      isReporter = true;
    } else if (currentUser && caseItem.contactInfo) {
      // Check if contact info matches
      if (caseItem.contactInfo.phone === currentUser.phone || 
          caseItem.contactInfo.email === currentUser.email) {
        isReporter = true;
      }
    }
    
    if (!isReporter) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only the reporter can approve this case'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Close the case
    caseItem.status = 'closed';
    caseItem.pendingReporterApproval = false;
    caseItem.lastStatusUpdate = new Date();
    caseItem.nextReminderDue = null;
    
    await caseItem.save();
    
    logger.info(`Case ${caseItem.caseId} approved and closed by reporter`);
    
    // Create a status update for the approval
    try {
      const { StatusUpdate } = require('../models');
      await StatusUpdate.create({
        caseId: req.params.id,
        updatedBy: userId,
        previousStatus: 'in_progress',
        newStatus: 'closed',
        condition: 'recovered',
        description: 'Reporter approved the case resolution and closed the case.',
        photos: [],
        notes: 'Case approved by reporter'
      });
    } catch (statusError) {
      logger.error('Error creating approval status update:', statusError);
      // Don't fail the approval if status update creation fails
    }
    
    res.json({
      success: true,
      data: {
        caseId: caseItem.caseId,
        status: caseItem.status,
        message: 'Case successfully closed'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error approving case:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to approve case'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/cases/:id/reporter-reject
 * @desc    Reporter rejects the resolution and reopens the case
 * @access  Private (requires authentication - must be reporter)
 */
router.post('/:id/reporter-reject', optionalAuth, async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);

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

    // Verify user is the reporter
    const userId = req.user?.id || req.user?._id;
    const User = require('../models/User');
    const currentUser = await User.findById(userId);
    
    // Check if user is the reporter by ID or by contact info (for cases created before auth)
    let isReporter = false;
    
    if (caseItem.reporterId && caseItem.reporterId.toString() === userId?.toString()) {
      isReporter = true;
    } else if (currentUser && caseItem.contactInfo) {
      // Check if contact info matches
      if (caseItem.contactInfo.phone === currentUser.phone || 
          caseItem.contactInfo.email === currentUser.email) {
        isReporter = true;
      }
    }
    
    if (!isReporter) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only the reporter can reject this case resolution'
        },
        timestamp: new Date().toISOString()
      });
    }

    const { reason } = req.body;

    // Reopen the case
    caseItem.status = 'in_progress';
    caseItem.pendingReporterApproval = false;
    caseItem.resolvedAt = null;
    caseItem.lastStatusUpdate = new Date();
    caseItem.nextReminderDue = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await caseItem.save();
    
    logger.info(`Case ${caseItem.caseId} rejected by reporter and reopened`);
    
    // Create a status update for the rejection
    try {
      const { StatusUpdate } = require('../models');
      await StatusUpdate.create({
        caseId: req.params.id,
        updatedBy: userId,
        previousStatus: 'in_progress',
        newStatus: 'in_progress',
        condition: 'stable',
        description: reason || 'Reporter rejected the case resolution. Case has been reopened for further action.',
        photos: [],
        notes: 'Case rejected by reporter - needs more work'
      });
    } catch (statusError) {
      logger.error('Error creating rejection status update:', statusError);
      // Don't fail the rejection if status update creation fails
    }
    
    // Create a system message about the rejection
    try {
      const Message = require('../models/Message');
      await Message.create({
        caseId: req.params.id,
        senderId: null, // System message
        content: `Reporter rejected the resolution${reason ? `: ${reason}` : ''}. Case has been reopened.`,
        messageType: 'system',
        priority: 'high'
      });
    } catch (msgError) {
      logger.error('Error creating rejection message:', msgError);
    }
    
    res.json({
      success: true,
      data: {
        caseId: caseItem.caseId,
        status: caseItem.status,
        message: 'Case has been reopened. The helper will be notified.'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error rejecting case:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reject case'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/cases/fix-pending-approvals
 * @desc    Fix cases that are resolved but missing pendingReporterApproval flag
 * @access  Public (temporary migration endpoint)
 */
router.post('/fix-pending-approvals', async (req, res) => {
  try {
    // Find all resolved cases that require approval
    const allResolvedCases = await Case.find({ 
      status: 'resolved',
      requiresReporterApproval: true 
    });
    logger.info(`Found ${allResolvedCases.length} resolved cases requiring approval`);
    
    let fixedCount = 0;
    for (const caseItem of allResolvedCases) {
      logger.info(`Fixing case ${caseItem.caseId}: changing status from resolved to in_progress`);
      // Change status to in_progress and set pendingReporterApproval
      caseItem.status = 'in_progress';
      caseItem.pendingReporterApproval = true;
      await caseItem.save();
      fixedCount++;
      logger.info(`Fixed case ${caseItem.caseId} - status changed to in_progress, pendingReporterApproval set to true`);
    }

    res.json({
      success: true,
      data: {
        fixedCount,
        totalResolved: allResolvedCases.length,
        message: `Fixed ${fixedCount} case(s) - changed status from resolved to in_progress`
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fixing pending approvals:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fix pending approvals'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/cases/nearby/ngos
 * @desc    Find NGOs near a location
 * @access  Public
 */
router.get('/nearby/ngos', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Latitude and longitude are required'
        },
        timestamp: new Date().toISOString()
      });
    }

    // TODO: Query User model for NGOs near location
    // For now, return mock data
    const mockNGOs = [
      {
        id: '1',
        name: 'Animal Welfare Society',
        distance: 2.5,
        phone: '+91 98765 43210',
        address: 'Andheri West, Mumbai'
      },
      {
        id: '2',
        name: 'Pet Rescue Foundation',
        distance: 5.2,
        phone: '+91 98765 43211',
        address: 'Bandra East, Mumbai'
      }
    ];

    res.json({
      success: true,
      data: {
        ngos: mockNGOs,
        count: mockNGOs.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error finding NGOs:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to find NGOs'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
