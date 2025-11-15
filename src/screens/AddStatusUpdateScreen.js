/**
 * Add Status Update Screen
 * Allows assigned helpers to provide case updates
 */
import { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import GlassButton from '../components/GlassButton';
import GlassSelect from '../components/GlassSelect';
import GlassInput from '../components/GlassInput';
import PhotoManager from '../components/PhotoManager';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../../services/api';
import toast from '../utils/toast';

export default function AddStatusUpdateScreen({ route, navigation }) {
  const { caseId } = route.params;
  const insets = useSafeAreaInsets();

  const [condition, setCondition] = useState('stable');
  const [newStatus, setNewStatus] = useState('in_progress');
  const [description, setDescription] = useState('');
  const [treatmentProvided, setTreatmentProvided] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    // Validation
    if (description.length < 50) {
      toast.warning('Description Required', 'Please provide at least 50 characters describing the update');
      return;
    }

    if (photos.length < 2) {
      toast.warning('Photos Required', 'Please add at least 2 photos showing current condition');
      return;
    }

    try {
      setSubmitting(true);

      // Upload photos to Cloudinary first
      let uploadedPhotoUrls = [];
      if (photos && photos.length > 0) {
        const photoUris = photos.map(p => p.uri || p);
        const uploadResponse = await apiService.uploadImages(photoUris);
        
        if (uploadResponse.success && uploadResponse.data.images) {
          uploadedPhotoUrls = uploadResponse.data.images.map(img => img.url);
        } else {
          throw new Error('Failed to upload photos');
        }
      }

      const updateData = {
        condition,
        newStatus,
        description,
        treatmentProvided: treatmentProvided || undefined,
        nextSteps: nextSteps || undefined,
        photos: uploadedPhotoUrls
      };

      const response = await apiService.addStatusUpdate(caseId, updateData);

      if (response.success) {
        toast.success('Update Added', 'Status update has been recorded');
        navigation.goBack();
      }
    } catch (error) {
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
            Provide detailed updates with at least 2 photos showing the animal's current condition
          </Text>
        </View>

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
          <Text style={styles.label}>Treatment Provided (Optional)</Text>
          <GlassInput
            value={treatmentProvided}
            onChangeText={setTreatmentProvided}
            placeholder="Describe any medical treatment, food, or care provided..."
            multiline
            numberOfLines={4}
            maxLength={1000}
          />
        </View>

        {/* Next Steps */}
        <View style={styles.section}>
          <Text style={styles.label}>Next Steps (Optional)</Text>
          <GlassInput
            value={nextSteps}
            onChangeText={setNextSteps}
            placeholder="What are the planned next actions or follow-up care..."
            multiline
            numberOfLines={4}
            maxLength={1000}
          />
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.label}>Photos * (minimum 2 required)</Text>
          <Text style={styles.hint}>
            Take clear photos showing the animal's current condition
          </Text>
          <PhotoManager
            photos={photos}
            onPhotosChange={setPhotos}
            maxPhotos={5}
            required={true}
          />
        </View>

        {/* Submit Button */}
        <GlassButton
          title="Submit Update"
          onPress={handleSubmit}
          variant="primary"
          size="large"
          disabled={description.length < 50 || photos.length < 2}
          icon={<MaterialIcons name="check" size={20} color={theme.colors.white} />}
        />
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
});
