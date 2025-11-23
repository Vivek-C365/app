/**
 * Add Status Update Screen
 * Allows assigned helpers to provide case updates with mandatory photo requirements
 */
import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
  TextInput,
  Alert,
  Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { theme } from '../theme';
import GlassButton from '../components/GlassButton';
import GlassSelect from '../components/GlassSelect';
import GlassInput from '../components/GlassInput';
import PhotoManager from '../components/PhotoManager';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/apiService';
import caseService from '../services/caseService';
import notificationService from '../services/notificationService';
import { supabase } from '../config/supabase';
import toast from '../utils/toast';

export default function AddStatusUpdateScreen({ route, navigation }) {
  const { caseId, reminderNotification } = route.params;
  const insets = useSafeAreaInsets();

  const [condition, setCondition] = useState('stable');
  const [newStatus, setNewStatus] = useState('in_progress');
  const [description, setDescription] = useState('');
  const [treatmentProvided, setTreatmentProvided] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [validatingPhotos, setValidatingPhotos] = useState(false);
  const [photoErrors, setPhotoErrors] = useState([]);
  const [previousStatus, setPreviousStatus] = useState('');

  // Load case data to get current status
  useEffect(() => {
    loadCaseData();
  }, [caseId]);

  const loadCaseData = async () => {
    try {
      const response = await caseService.getCaseById(caseId);
      if (response.success && response.case) {
        setPreviousStatus(response.case.status);
      }
    } catch (error) {
      console.error('Error loading case:', error);
    }
  };

  const conditionOptions = [
    { label: 'Improving', value: 'improving' },
    { label: 'Stable', value: 'stable' },
    { label: 'Deteriorating', value: 'deteriorating' },
    { label: 'Critical', value: 'critical' },
    { label: 'Recovered', value: 'recovered' }
  ];

  const statusOptions = [
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Closed', value: 'closed' }
  ];

  /**
   * Validate photo quality and metadata
   */
  const validatePhoto = async (photoUri) => {
    const errors = [];
    
    try {
      // Check file size (max 5MB)
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const sizeInMB = blob.size / (1024 * 1024);
      
      if (sizeInMB > 5) {
        errors.push('Photo exceeds 5MB size limit');
      }

      // Check format
      const extension = photoUri.split('.').pop()?.toLowerCase();
      if (!['jpg', 'jpeg', 'png'].includes(extension)) {
        errors.push('Only JPEG and PNG formats are supported');
      }

      // Get image dimensions
      return new Promise((resolve) => {
        Image.getSize(
          photoUri,
          (width, height) => {
            // Check minimum resolution (640x480)
            if (width < 640 || height < 480) {
              errors.push('Photo resolution too low (minimum 640x480)');
            }
            resolve({ valid: errors.length === 0, errors });
          },
          () => {
            errors.push('Unable to read photo dimensions');
            resolve({ valid: false, errors });
          }
        );
      });
    } catch (error) {
      errors.push('Failed to validate photo');
      return { valid: false, errors };
    }
  };

  /**
   * Compress and optimize photo before upload
   */
  const compressPhoto = async (photoUri) => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 1920 } }], // Resize to max width 1920px
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      return manipResult.uri;
    } catch (error) {
      console.error('Error compressing photo:', error);
      return photoUri; // Return original if compression fails
    }
  };

  /**
   * Handle photo selection with validation
   */
  const handlePhotosChange = async (newPhotos) => {
    if (newPhotos.length > 5) {
      toast.warning('Too Many Photos', 'Maximum 5 photos allowed');
      return;
    }

    setValidatingPhotos(true);
    setPhotoErrors([]);
    
    const validatedPhotos = [];
    const allErrors = [];

    for (let i = 0; i < newPhotos.length; i++) {
      const photoUri = newPhotos[i].uri || newPhotos[i];
      const validation = await validatePhoto(photoUri);
      
      if (validation.valid) {
        // Compress photo
        const compressedUri = await compressPhoto(photoUri);
        validatedPhotos.push({ uri: compressedUri, original: photoUri });
      } else {
        allErrors.push(`Photo ${i + 1}: ${validation.errors.join(', ')}`);
      }
    }

    if (allErrors.length > 0) {
      setPhotoErrors(allErrors);
      toast.warning('Photo Validation Issues', allErrors[0]);
    }

    setPhotos(validatedPhotos);
    setValidatingPhotos(false);
  };

  const handleSubmit = async () => {
    // Validation
    if (description.length < 50) {
      toast.warning('Description Required', 'Please provide at least 50 characters describing the update');
      return;
    }

    if (photos.length < 2) {
      toast.warning('Photos Required', 'Please add exactly 2 photos showing current condition');
      return;
    }

    if (photos.length > 5) {
      toast.warning('Too Many Photos', 'Maximum 5 photos allowed');
      return;
    }

    if (!treatmentProvided.trim()) {
      toast.warning('Treatment Required', 'Please describe the treatment provided');
      return;
    }

    if (!nextSteps.trim()) {
      toast.warning('Next Steps Required', 'Please describe the planned next steps');
      return;
    }

    try {
      setSubmitting(true);

      // Upload photos to Cloudinary
      let uploadedPhotoUrls = [];
      if (photos && photos.length > 0) {
        toast.info('Uploading Photos', 'Please wait while we upload your photos...');
        const { uploadMultipleToCloudinary } = require('../services/uploadService');
        
        const uploadResults = await uploadMultipleToCloudinary(photos, (progress) => {
          console.log('Upload progress:', progress);
        });
        
        // Extract successful URLs
        uploadedPhotoUrls = uploadResults
          .filter(result => result.success)
          .map(result => result.url);
        
        if (uploadedPhotoUrls.length < photos.length) {
          toast.warning('Some Photos Failed', `${uploadedPhotoUrls.length} of ${photos.length} photos uploaded`);
        }
        
        if (uploadedPhotoUrls.length === 0) {
          throw new Error('Failed to upload photos');
        }
      }

      // Get current user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('You must be logged in to add status updates');
      }

      const updateData = {
        previous_status: previousStatus,
        new_status: newStatus,
        condition,
        description,
        treatment_provided: treatmentProvided,
        next_steps: nextSteps,
        photos: uploadedPhotoUrls,
        updated_by: currentUser.id,
      };

      const response = await caseService.addStatusUpdate(caseId, updateData);

      if (response.success) {
        toast.success('Update Added', 'Status update has been recorded successfully');
        
        // If this was from a reminder notification, cancel any pending reminders
        if (reminderNotification) {
          await notificationService.cancelStatusUpdateReminder(caseId);
          console.log('Reminder notification cleared after status update');
        }
        
        // Schedule next reminder (24 hours from now)
        await notificationService.scheduleStatusUpdateReminder({
          caseId,
          title: 'Status Update Required',
          body: 'Please provide an update on the animal rescue case',
          delaySeconds: 24 * 60 * 60, // 24 hours
        });
        
        navigation.goBack();
      } else {
        throw new Error(response.error || 'Failed to add status update');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to Add Update', error.message || 'Please try again');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitting) {
    return <LoadingSpinner fullScreen message="Submitting update..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Status Update</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <MaterialIcons name="info" size={20} color={theme.colors.primary} />
          <Text style={styles.infoBannerText}>
            Status updates are mandatory every 24 hours. Provide detailed updates with exactly 2 photos showing the animal's current condition.
          </Text>
        </View>

        {/* Reminder Notice */}
        {reminderNotification && (
          <View style={styles.reminderBanner}>
            <MaterialIcons name="notifications-active" size={20} color={theme.colors.warning} />
            <Text style={styles.reminderBannerText}>
              This update is overdue. Please submit immediately to avoid case escalation.
            </Text>
          </View>
        )}

        {/* Photo Validation Errors */}
        {photoErrors.length > 0 && (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error" size={20} color={theme.colors.error} />
            <View style={{ flex: 1 }}>
              {photoErrors.map((error, index) => (
                <Text key={index} style={styles.errorText}>{error}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Condition */}
        <View style={styles.section}>
          <Text style={styles.label}>Animal Condition *</Text>
          <GlassSelect
            value={condition}
            onValueChange={setCondition}
            options={conditionOptions}
          />
        </View>

        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.label}>Case Status *</Text>
          <GlassSelect
            value={newStatus}
            onValueChange={setNewStatus}
            options={statusOptions}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Update Description * (min 50 characters)</Text>
          <Text style={styles.hint}>
            Describe the current situation, any changes, and actions taken
          </Text>
          <GlassInput
            value={description}
            onChangeText={setDescription}
            placeholder="Provide detailed description of the animal's condition and any treatment provided..."
            multiline
            numberOfLines={6}
            maxLength={2000}
          />
          <Text style={styles.charCount}>{description.length} / 2000</Text>
        </View>

        {/* Treatment Provided */}
        <View style={styles.section}>
          <Text style={styles.label}>Treatment Provided *</Text>
          <Text style={styles.hint}>
            Describe any medical treatment, food, or care provided
          </Text>
          <GlassInput
            value={treatmentProvided}
            onChangeText={setTreatmentProvided}
            placeholder="e.g., Applied antiseptic, provided water and food, administered pain relief..."
            multiline
            numberOfLines={4}
            maxLength={1000}
          />
        </View>

        {/* Next Steps */}
        <View style={styles.section}>
          <Text style={styles.label}>Next Steps *</Text>
          <Text style={styles.hint}>
            What are the planned next actions or follow-up care
          </Text>
          <GlassInput
            value={nextSteps}
            onChangeText={setNextSteps}
            placeholder="e.g., Taking to vet tomorrow morning, monitoring overnight, scheduling surgery..."
            multiline
            numberOfLines={4}
            maxLength={1000}
          />
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.label}>Photos * (exactly 2 required)</Text>
          <Text style={styles.hint}>
            Take clear, recent photos showing the animal's current condition. Photos must be JPEG or PNG format, minimum 640x480 resolution, and under 5MB each.
          </Text>
          {validatingPhotos && (
            <View style={styles.validatingContainer}>
              <LoadingSpinner size="small" />
              <Text style={styles.validatingText}>Validating photos...</Text>
            </View>
          )}
          <PhotoManager
            photos={photos}
            onPhotosChange={handlePhotosChange}
            maxPhotos={5}
            required={true}
          />
          <View style={styles.photoRequirements}>
            <Text style={styles.photoRequirementText}>
              ✓ Format: JPEG or PNG
            </Text>
            <Text style={styles.photoRequirementText}>
              ✓ Size: Maximum 5MB per photo
            </Text>
            <Text style={styles.photoRequirementText}>
              ✓ Resolution: Minimum 640x480 pixels
            </Text>
            <Text style={styles.photoRequirementText}>
              ✓ Quality: Clear and well-lit
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <GlassButton
          title="Submit Update"
          onPress={handleSubmit}
          variant="primary"
          size="large"
          disabled={
            description.length < 50 || 
            photos.length < 2 || 
            !treatmentProvided.trim() || 
            !nextSteps.trim() ||
            validatingPhotos
          }
          icon={<MaterialIcons name="check" size={20} color={theme.colors.white} />}
        />
        
        {/* Validation Summary */}
        <View style={styles.validationSummary}>
          <Text style={styles.validationTitle}>Checklist:</Text>
          <Text style={[styles.validationItem, description.length >= 50 ? styles.validationItemComplete : null]}>
            {description.length >= 50 ? '✓' : '○'} Description (min 50 characters)
          </Text>
          <Text style={[styles.validationItem, photos.length >= 2 ? styles.validationItemComplete : null]}>
            {photos.length >= 2 ? '✓' : '○'} Photos (minimum 2)
          </Text>
          <Text style={[styles.validationItem, treatmentProvided.trim() ? styles.validationItemComplete : null]}>
            {treatmentProvided.trim() ? '✓' : '○'} Treatment provided
          </Text>
          <Text style={[styles.validationItem, nextSteps.trim() ? styles.validationItemComplete : null]}>
            {nextSteps.trim() ? '✓' : '○'} Next steps planned
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  infoBannerText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    lineHeight: 20,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  hint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  charCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.warning + '20',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  reminderBannerText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning,
    lineHeight: 20,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.error + '20',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },
  validatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  validatingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  photoRequirements: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  photoRequirementText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },
  validationSummary: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  validationTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  validationItem: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  validationItemComplete: {
    color: theme.colors.success,
    fontWeight: theme.typography.fontWeight.medium,
  },
});
