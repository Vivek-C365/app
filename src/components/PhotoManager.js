/**
 * Photo Manager Component
 * Main component for photo capture, selection, and upload
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import Modal from './Modal';
import CameraCapture from './CameraCapture';
import ImagePicker from './ImagePicker';
import PhotoPreview from './PhotoPreview';
import GlassButton from './GlassButton';
import { validateAndProcessImage, formatFileSize } from '../utils/imageUtils';
import { uploadMultipleToCloudinary } from '../services/uploadService';
import toast from '../utils/toast';

export default function PhotoManager({ 
  photos = [], 
  onPhotosChange, 
  maxPhotos = 5,
  required = false,
  showUploadButton = false,
}) {
  const [mode, setMode] = useState(null); // 'camera', 'gallery', 'preview'
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [previewPhotos, setPreviewPhotos] = useState([]); // Photos to show in preview
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const handleCameraCapture = async (photo) => {
    try {
      // Validate and process the photo
      const result = await validateAndProcessImage(photo);
      
      if (!result.valid) {
        toast.error('Invalid Photo', result.errors.join(', '));
        return;
      }

      // Add to captured photos - use compressed if available, otherwise original
      const photoToAdd = result.compressed || photo;
      
      const newPhotos = [...capturedPhotos, photoToAdd];
      
      // Update states
      setCapturedPhotos(newPhotos);
      setPreviewPhotos(newPhotos);
      setMode('preview');
    } catch (error) {
      // If validation fails, just use the original photo
      const newPhotos = [...capturedPhotos, photo];
      setCapturedPhotos(newPhotos);
      setPreviewPhotos(newPhotos);
      setMode('preview');
    }
  };

  const handleGallerySelect = async (assets) => {
    const photosArray = Array.isArray(assets) ? assets : [assets];
    
    // Validate all photos
    const validatedPhotos = [];
    const errors = [];
    
    for (const photo of photosArray) {
      const result = await validateAndProcessImage(photo);
      if (result.valid) {
        // Use compressed if available, otherwise original
        const photoToAdd = result.compressed || photo;
        validatedPhotos.push(photoToAdd);
      } else {
        errors.push(`${photo.fileName || 'Photo'}: ${result.errors.join(', ')}`);
      }
    }
    
    if (errors.length > 0) {
      toast.warning('Some Photos Invalid', errors.join(', '));
    }
    
    if (validatedPhotos.length > 0) {
      setSelectedPhotos(validatedPhotos);
      setPreviewPhotos(validatedPhotos);
      setMode('preview');
    }
  };

  const handlePreviewConfirm = () => {
    // Use previewPhotos since that's what we're showing
    const newPhotos = previewPhotos;
    
    // Filter out any invalid photos (null, undefined, or missing uri)
    const validNewPhotos = newPhotos.filter(photo => photo && photo.uri);
    
    if (validNewPhotos.length === 0) {
      toast.error('No Valid Photos', 'No valid photos to add');
      return;
    }
    
    const allPhotos = [...photos, ...validNewPhotos];
    
    if (allPhotos.length > maxPhotos) {
      toast.warning(
        'Too Many Photos',
        `You can only add up to ${maxPhotos} photos. Please remove some first.`
      );
      return;
    }
    
    onPhotosChange(allPhotos);
    handleCloseModal();
  };

  const handleRetake = () => {
    setCapturedPhotos([]);
    setSelectedPhotos([]);
    setPreviewPhotos([]);
    if (mode === 'camera') {
      setMode('camera');
    } else {
      setMode('gallery');
    }
  };

  const handleRemoveFromPreview = (index) => {
    const newPhotos = previewPhotos.filter((_, i) => i !== index);
    setPreviewPhotos(newPhotos);
    
    // Also update the source array
    if (mode === 'camera') {
      setCapturedPhotos(newPhotos);
    } else {
      setSelectedPhotos(newPhotos);
    }
    
    // If no photos left, go back to capture/select mode
    if (newPhotos.length === 0) {
      if (mode === 'camera') {
        setMode('camera');
      } else {
        setMode('gallery');
      }
    }
  };

  const handleRemovePhoto = (index) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newPhotos = photos.filter((_, i) => i !== index);
            onPhotosChange(newPhotos);
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setMode(null);
    setCapturedPhotos([]);
    setSelectedPhotos([]);
    setPreviewPhotos([]);
  };

  const handleUpload = async () => {
    if (photos.length === 0) {
      toast.warning('No Photos', 'Please add photos before uploading');
      return;
    }

    setUploading(true);
    setUploadProgress({ currentIndex: 0, totalProgress: 0, total: photos.length });

    try {
      const results = await uploadMultipleToCloudinary(photos, (progress) => {
        setUploadProgress(progress);
      });

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      if (failCount > 0) {
        toast.warning(
          'Upload Incomplete',
          `${successCount} uploaded, ${failCount} failed`
        );
      } else {
        toast.success('Success', 'All photos uploaded successfully!');
      }

      // Return URLs of successfully uploaded photos
      const urls = results.filter(r => r.success).map(r => r.url);
      return urls;
    } catch (error) {
      toast.error('Upload Failed', error.message);
      return [];
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <View style={styles.container}>
      {photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoList}
        >
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoItem}>
              <Image source={{ uri: photo.uri }} style={styles.photoImage} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemovePhoto(index)}
              >
                <MaterialIcons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.actions}>
        {canAddMore && (
          <>
            <GlassButton
              title="Take Photo"
              onPress={() => setMode('camera')}
              variant="light"
              icon={<MaterialIcons name="camera-alt" size={18} color={theme.colors.textPrimary} />}
            />
            <GlassButton
              title="Choose from Gallery"
              onPress={() => setMode('gallery')}
              variant="light"
              icon={<MaterialIcons name="photo-library" size={18} color={theme.colors.textPrimary} />}
            />
          </>
        )}
        
        {showUploadButton && photos.length > 0 && (
          <GlassButton
            title={uploading ? 'Uploading...' : 'Upload Photos'}
            onPress={handleUpload}
            variant="primary"
            loading={uploading}
            disabled={uploading}
            icon={!uploading && <MaterialIcons name="cloud-upload" size={18} color="#fff" />}
          />
        )}
      </View>

      {uploading && uploadProgress && (
        <View style={styles.uploadProgress}>
          <Text style={styles.uploadText}>
            Uploading {uploadProgress.currentIndex + 1} of {uploadProgress.total}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${uploadProgress.totalProgress}%` }
              ]} 
            />
          </View>
          <Text style={styles.uploadPercent}>{uploadProgress.totalProgress}%</Text>
        </View>
      )}

      {photos.length === 0 && required && (
        <View style={styles.emptyState}>
          <MaterialIcons name="add-photo-alternate" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>
            At least one photo is required
          </Text>
        </View>
      )}

      <Text style={styles.hint}>
        {photos.length} / {maxPhotos} photos added
      </Text>

      <Modal
        visible={mode === 'camera'}
        onClose={handleCloseModal}
        fullScreen
      >
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={handleCloseModal}
        />
      </Modal>

      <Modal
        visible={mode === 'gallery'}
        onClose={handleCloseModal}
        fullScreen
      >
        <ImagePicker
          onSelect={handleGallerySelect}
          onClose={handleCloseModal}
          multiple={true}
          maxImages={maxPhotos - photos.length}
        />
      </Modal>

      <Modal
        visible={mode === 'preview'}
        onClose={handleCloseModal}
        fullScreen
      >
        <PhotoPreview
          photos={previewPhotos}
          onConfirm={handlePreviewConfirm}
          onRetake={handleRetake}
          onRemove={handleRemoveFromPreview}
          onClose={handleCloseModal}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  photoList: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  photoItem: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    gap: theme.spacing.sm,
  },
  uploadProgress: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  uploadText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  uploadPercent: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  hint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
