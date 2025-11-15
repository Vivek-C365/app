/**
 * Image Utility Functions
 * Handles image compression, validation, and processing
 */
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { getInfoAsync } from 'expo-file-system/legacy';

/**
 * Image validation constraints
 */
export const IMAGE_CONSTRAINTS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MIN_WIDTH: 640,
  MIN_HEIGHT: 480,
  MAX_WIDTH: 4096,
  MAX_HEIGHT: 4096,
  ALLOWED_FORMATS: ['jpg', 'jpeg', 'png'],
  COMPRESSION_QUALITY: 0.8,
  THUMBNAIL_SIZE: 200,
};

/**
 * Validates image format
 * @param {string} uri - Image URI
 * @returns {boolean} - Whether format is valid
 */
export const validateImageFormat = (uri) => {
  const extension = uri.split('.').pop().toLowerCase();
  return IMAGE_CONSTRAINTS.ALLOWED_FORMATS.includes(extension);
};

/**
 * Gets image file size
 * @param {string} uri - Image URI
 * @returns {Promise<number>} - File size in bytes
 */
export const getImageSize = async (uri) => {
  try {
    const fileInfo = await getInfoAsync(uri);
    return fileInfo.size || 0;
  } catch (error) {
    return 0;
  }
};

/**
 * Validates image size
 * @param {string} uri - Image URI
 * @returns {Promise<{valid: boolean, size: number, error?: string}>}
 */
export const validateImageSize = async (uri) => {
  const size = await getImageSize(uri);
  
  if (size === 0) {
    return { valid: false, size: 0, error: 'Could not determine file size' };
  }
  
  if (size > IMAGE_CONSTRAINTS.MAX_FILE_SIZE) {
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    const maxMB = (IMAGE_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    return { 
      valid: false, 
      size, 
      error: `Image too large (${sizeMB}MB). Maximum size is ${maxMB}MB` 
    };
  }
  
  return { valid: true, size };
};

/**
 * Validates image dimensions
 * @param {Object} image - Image object with width and height
 * @returns {Object} - Validation result
 */
export const validateImageDimensions = (image) => {
  const { width, height } = image;
  
  if (width < IMAGE_CONSTRAINTS.MIN_WIDTH || height < IMAGE_CONSTRAINTS.MIN_HEIGHT) {
    return {
      valid: false,
      error: `Image too small. Minimum size is ${IMAGE_CONSTRAINTS.MIN_WIDTH}x${IMAGE_CONSTRAINTS.MIN_HEIGHT}px`,
    };
  }
  
  if (width > IMAGE_CONSTRAINTS.MAX_WIDTH || height > IMAGE_CONSTRAINTS.MAX_HEIGHT) {
    return {
      valid: false,
      error: `Image too large. Maximum size is ${IMAGE_CONSTRAINTS.MAX_WIDTH}x${IMAGE_CONSTRAINTS.MAX_HEIGHT}px`,
    };
  }
  
  return { valid: true };
};

/**
 * Validates image quality (checks if image is too blurry or corrupted)
 * @param {Object} image - Image object
 * @returns {Object} - Validation result
 */
export const validateImageQuality = (image) => {
  // Basic quality check - ensure image has valid dimensions
  if (!image.width || !image.height || image.width < 1 || image.height < 1) {
    return {
      valid: false,
      error: 'Image appears to be corrupted',
    };
  }
  
  return { valid: true };
};

/**
 * Compresses image to reduce file size
 * @param {string} uri - Image URI
 * @param {number} quality - Compression quality (0-1)
 * @returns {Promise<Object>} - Compressed image object
 */
export const compressImage = async (uri, quality = IMAGE_CONSTRAINTS.COMPRESSION_QUALITY) => {
  try {
    const manipResult = await manipulateAsync(
      uri,
      [{ resize: { width: 1920 } }], // Resize to max width of 1920px
      {
        compress: quality,
        format: SaveFormat.JPEG,
      }
    );
    
    return manipResult;
  } catch (error) {
    throw new Error('Failed to compress image');
  }
};

/**
 * Creates thumbnail from image
 * @param {string} uri - Image URI
 * @param {number} size - Thumbnail size
 * @returns {Promise<Object>} - Thumbnail image object
 */
export const createThumbnail = async (uri, size = IMAGE_CONSTRAINTS.THUMBNAIL_SIZE) => {
  try {
    const manipResult = await manipulateAsync(
      uri,
      [{ resize: { width: size } }],
      {
        compress: 0.7,
        format: SaveFormat.JPEG,
      }
    );
    
    return manipResult;
  } catch (error) {
    throw new Error('Failed to create thumbnail');
  }
};

/**
 * Validates and processes image
 * @param {Object} image - Image object from camera or picker
 * @returns {Promise<Object>} - Validation and processing result
 */
export const validateAndProcessImage = async (image) => {
  const result = {
    valid: false,
    errors: [],
    original: image,
    compressed: null,
    thumbnail: null,
  };

  // Validate format
  if (!validateImageFormat(image.uri)) {
    result.errors.push('Invalid image format. Please use JPG or PNG');
    return result;
  }

  // Validate size
  const sizeValidation = await validateImageSize(image.uri);
  if (!sizeValidation.valid) {
    result.errors.push(sizeValidation.error);
    return result;
  }

  // Validate dimensions (only if width and height are provided)
  if (image.width && image.height) {
    const dimensionsValidation = validateImageDimensions(image);
    if (!dimensionsValidation.valid) {
      result.errors.push(dimensionsValidation.error);
      return result;
    }

    // Validate quality
    const qualityValidation = validateImageQuality(image);
    if (!qualityValidation.valid) {
      result.errors.push(qualityValidation.error);
      return result;
    }
  }

  // Compress image
  try {
    result.compressed = await compressImage(image.uri);
    result.thumbnail = await createThumbnail(image.uri);
    result.valid = true;
  } catch (error) {
    result.errors.push('Failed to process image');
  }

  return result;
};

/**
 * Formats file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Extracts EXIF data from image
 * @param {Object} image - Image object with exif data
 * @returns {Object} - Extracted EXIF data
 */
export const extractExifData = (image) => {
  if (!image.exif) return null;
  
  return {
    timestamp: image.exif.DateTime || image.exif.DateTimeOriginal,
    location: image.exif.GPSLatitude && image.exif.GPSLongitude ? {
      latitude: image.exif.GPSLatitude,
      longitude: image.exif.GPSLongitude,
    } : null,
    camera: image.exif.Make && image.exif.Model ? 
      `${image.exif.Make} ${image.exif.Model}` : null,
  };
};
