/**
 * @fileoverview Upload routes
 * Handles file uploads to Cloudinary
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadImage } = require('../config/cloudinary');
const logger = require('../utils/logger');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

/**
 * @route   POST /api/upload/image
 * @desc    Upload single image to Cloudinary
 * @access  Public
 */
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No image file provided'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Convert buffer to base64 data URI
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // Upload to Cloudinary
    const result = await uploadImage(dataURI);

    logger.info(`Image uploaded to Cloudinary: ${result.publicId}`);

    res.json({
      success: true,
      data: {
        url: result.url,
        publicId: result.publicId,
        format: result.format,
        width: result.width,
        height: result.height
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: error.message || 'Failed to upload image'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/upload/images
 * @desc    Upload multiple images to Cloudinary
 * @access  Public
 */
router.post('/images', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILES',
          message: 'No image files provided'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Upload all images to Cloudinary
    const uploadPromises = req.files.map(async (file) => {
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      return await uploadImage(dataURI);
    });

    const results = await Promise.all(uploadPromises);

    logger.info(`${results.length} images uploaded to Cloudinary`);

    res.json({
      success: true,
      data: {
        images: results.map(r => ({
          url: r.url,
          publicId: r.publicId,
          format: r.format,
          width: r.width,
          height: r.height
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error uploading images:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: error.message || 'Failed to upload images'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
