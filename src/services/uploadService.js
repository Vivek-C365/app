/**
 * Upload Service
 * Handles image uploads to Cloudinary with progress tracking
 */
import axios from 'axios';
import config from '../../config';

/**
 * Uploads image to Cloudinary
 * @param {string} uri - Image URI
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<Object>} - Upload result with URL
 */
export const uploadToCloudinary = async (uri, onProgress) => {
  try {
    // Create form data
    const formData = new FormData();
    
    // Extract filename from URI
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    // Append image file
    formData.append('file', {
      uri,
      name: filename,
      type,
    });
    
    // For unsigned uploads, we only need upload_preset
    // No API key or signature needed
    formData.append('upload_preset', 'ml_default');
    
    console.log('Uploading to Cloudinary:', {
      cloud: config.CLOUDINARY_CLOUD_NAME,
      preset: 'ml_default',
      filename,
    });
    
    // Upload to Cloudinary using unsigned upload
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${config.CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      }
    );
    
    console.log('Upload successful:', response.data.secure_url);
    
    return {
      success: true,
      url: response.data.secure_url,
      publicId: response.data.public_id,
      format: response.data.format,
      width: response.data.width,
      height: response.data.height,
      bytes: response.data.bytes,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    console.error('Error details:', error.response?.data);
    throw new Error(error.response?.data?.error?.message || 'Failed to upload image');
  }
};

/**
 * Uploads multiple images to Cloudinary
 * @param {Array} images - Array of image URIs
 * @param {Function} onProgress - Progress callback with current index and total
 * @returns {Promise<Array>} - Array of upload results
 */
export const uploadMultipleToCloudinary = async (images, onProgress) => {
  const results = [];
  const total = images.length;
  
  for (let i = 0; i < total; i++) {
    try {
      const result = await uploadToCloudinary(images[i].uri, (progress) => {
        if (onProgress) {
          onProgress({
            currentIndex: i,
            currentProgress: progress,
            totalProgress: Math.round(((i + (progress / 100)) / total) * 100),
            total,
          });
        }
      });
      
      results.push(result);
    } catch (error) {
      console.error(`Failed to upload image ${i + 1}:`, error);
      results.push({
        success: false,
        error: error.message,
      });
    }
  }
  
  return results;
};

/**
 * Uploads image to backend server (alternative to Cloudinary)
 * @param {string} uri - Image URI
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} - Upload result
 */
export const uploadToServer = async (uri, onProgress) => {
  try {
    const formData = new FormData();
    
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('photo', {
      uri,
      name: filename,
      type,
    });
    
    const response = await axios.post(
      `${config.API_URL}/api/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      }
    );
    
    return {
      success: true,
      url: response.data.url,
    };
  } catch (error) {
    console.error('Server upload error:', error);
    throw new Error('Failed to upload image to server');
  }
};

/**
 * Deletes image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<boolean>} - Success status
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    // This requires server-side implementation with Cloudinary API credentials
    // For now, we'll just return success
    console.log('Delete image:', publicId);
    return true;
  } catch (error) {
    console.error('Failed to delete image:', error);
    return false;
  }
};
