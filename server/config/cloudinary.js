/**
 * @fileoverview Cloudinary configuration
 * Handles image upload and storage configuration
 */

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload options for animal rescue photos
 */
const uploadOptions = {
  folder: 'animal-rescue',
  resource_type: 'image',
  allowed_formats: ['jpg', 'jpeg', 'png'],
  transformation: [
    { width: 1920, height: 1920, crop: 'limit' },
    { quality: 'auto:good' },
  ],
};

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Path to the image file
 * @param {Object} options - Additional upload options
 * @returns {Promise<Object>} - Upload result
 */
const uploadImage = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      ...uploadOptions,
      ...options,
    });
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};

/**
 * Generate thumbnail URL
 * @param {string} publicId - Cloudinary public ID
 * @param {number} width - Thumbnail width
 * @param {number} height - Thumbnail height
 * @returns {string} - Thumbnail URL
 */
const getThumbnailUrl = (publicId, width = 200, height = 200) => {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fill',
    quality: 'auto:good',
  });
};

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
  getThumbnailUrl,
  uploadOptions,
};
