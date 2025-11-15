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

      const { animalType, condition, description, location, photos, contactInfo } = req.body;

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
      const caseData = {
        reporterId: req.user?._id || null, // Will be null for unauthenticated users
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
        urgencyLevel: condition === 'injured' || condition === 'trapped' ? 'high' : 'medium'
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
    const { status, animalType, urgencyLevel, limit = 50, skip = 0, myOnly } = req.query;

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
      }
    };
    
    // Add helper to assignedHelpers array if we have a valid ID
    // $addToSet will automatically prevent duplicates
    if (helperIdToAdd) {
      updateData.$addToSet = { assignedHelpers: helperIdToAdd };
      logger.info(`Adding helper ${helperIdToAdd} to case ${caseItem.caseId}`);
    }
    
    // Use updateOne to bypass validation on unchanged fields
    const updateResult = await Case.updateOne(
      { _id: req.params.id },
      updateData
    );
    
    logger.info(`Case ${caseItem.caseId} assigned to helper ${helperIdToAdd || 'unknown'}. Modified: ${updateResult.modifiedCount}`);

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
