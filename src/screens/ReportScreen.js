/**
 * Report Animal Screen
 * Allows users to report animals in need with full functionality
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import GlassInput from '../components/GlassInput';
import GlassSelect from '../components/GlassSelect';
import GlassButton from '../components/GlassButton';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import PhotoManager from '../components/PhotoManager';
import LocationPicker from '../components/LocationPicker';
import apiService from '../../services/api';
import config from '../../config';
import toast from '../utils/toast';

const DRAFT_KEY = '@report_draft';

export default function ReportScreen() {
  const [animalType, setAnimalType] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [locationCoords, setLocationCoords] = useState(null);
  const [landmark, setLandmark] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [hasDraft, setHasDraft] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  // Load draft on mount
  useEffect(() => {
    loadDraft();
  }, []);

  // Auto-save draft when form changes
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft();
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(timer);
  }, [animalType, condition, description, location, locationCoords, landmark, contactName, contactPhone, contactEmail, photos]);

  const loadDraft = async () => {
    try {
      const draftJson = await AsyncStorage.getItem(DRAFT_KEY);
      if (draftJson) {
        const draft = JSON.parse(draftJson);
        setAnimalType(draft.animalType || '');
        setCondition(draft.condition || '');
        setDescription(draft.description || '');
        setLocation(draft.location || '');
        setLocationCoords(draft.locationCoords || null);
        setLandmark(draft.landmark || '');
        setContactName(draft.contactName || '');
        setContactPhone(draft.contactPhone || '');
        setContactEmail(draft.contactEmail || '');
        setPhotos(draft.photos || []);
        setHasDraft(true);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = async () => {
    try {
      // Only save if there's some content
      if (animalType || condition || description || location || photos.length > 0) {
        const draft = {
          animalType,
          condition,
          description,
          location,
          locationCoords,
          landmark,
          contactName,
          contactPhone,
          contactEmail,
          photos,
          savedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!animalType) {
      errors.animalType = 'Please select an animal type';
    }

    if (!condition) {
      errors.condition = 'Please select the animal condition';
    }

    if (!description || description.trim().length < 10) {
      errors.description = 'Please provide a detailed description (at least 10 characters)';
    }

    if (!location || location.trim().length < 5) {
      errors.location = 'Please provide a valid location';
    }

    if (!contactName || contactName.trim().length < 2) {
      errors.contactName = 'Please provide your name';
    }

    if (!contactPhone || !/^[+]?[\d\s-]{10,}$/.test(contactPhone)) {
      errors.contactPhone = 'Please provide a valid phone number';
    }

    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      errors.contactEmail = 'Please provide a valid email address';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLocationSelect = (locationData) => {
    // LocationPicker returns { latitude, longitude, address }
    if (locationData.latitude && locationData.longitude) {
      setLocationCoords({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      });
    }
    
    // Set address
    if (locationData.address) {
      setLocation(locationData.address);
    }
    
    // Close the picker
    setShowLocationPicker(false);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Validation Error', 'Please fill all required fields correctly');
      return;
    }

    setShowSubmitDialog(true);
  };

  const confirmSubmit = async () => {
    setShowSubmitDialog(false);
    setLoading(true);

    try {
      // Prepare case data
      const caseData = {
        animalType,
        condition,
        description,
        location: {
          address: location,
          coordinates: locationCoords ? [locationCoords.longitude, locationCoords.latitude] : undefined,
          landmarks: landmark,
          description: location,
          isApproximate: !locationCoords,
        },
        photos,
        contactInfo: {
          phone: contactPhone,
          email: contactEmail || undefined,
          name: contactName,
        },
      };

      // Submit to API
      const response = await apiService.createCase(caseData);

      if (response.success) {
        // Clear draft after successful submission
        await clearDraft();
        
        // Reset form
        setAnimalType('');
        setCondition('');
        setDescription('');
        setLocation('');
        setLocationCoords(null);
        setLandmark('');
        setContactName('');
        setContactPhone('');
        setContactEmail('');
        setPhotos([]);
        setValidationErrors({});
        
        toast.success('Report Submitted!', 'Nearby volunteers will be notified immediately');
        setShowSuccessModal(true);
      } else {
        throw new Error(response.error?.message || 'Failed to submit report');
      }
    } catch (error) {
      toast.error(
        'Submission Failed',
        error.message || 'Failed to submit report. Your draft has been saved.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearForm = () => {
    Alert.alert(
      'Clear Form',
      'Are you sure you want to clear all fields? Your draft will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setAnimalType('');
            setCondition('');
            setDescription('');
            setLocation('');
            setLocationCoords(null);
            setLandmark('');
            setContactName('');
            setContactPhone('');
            setContactEmail('');
            setPhotos([]);
            setValidationErrors({});
            await clearDraft();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 140,
            paddingHorizontal: isSmallScreen ? theme.spacing.md : theme.spacing.lg,
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Report Animal</Text>
          <Text style={styles.subtitle}>Help an animal in need</Text>
          {hasDraft && (
            <View style={styles.draftBadge}>
              <MaterialIcons name="drafts" size={16} color={theme.colors.warning} />
              <Text style={styles.draftText}>Draft saved</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Animal Information</Text>
          
          <GlassSelect
            label="Animal Type *"
            placeholder="Select animal type"
            value={animalType}
            onValueChange={setAnimalType}
            icon={<MaterialIcons name="pets" size={20} color={theme.colors.textSecondary} />}
            error={validationErrors.animalType}
            options={[
              { 
                value: 'dog', 
                label: 'Dog', 
                icon: <MaterialIcons name="pets" size={24} color={theme.colors.primary} />,
                description: 'Domestic dog or stray'
              },
              { 
                value: 'cat', 
                label: 'Cat',
                icon: <MaterialIcons name="pets" size={24} color={theme.colors.primary} />,
                description: 'Domestic cat or stray'
              },
              { 
                value: 'bird', 
                label: 'Bird',
                icon: <MaterialIcons name="flutter-dash" size={24} color={theme.colors.primary} />,
                description: 'Any bird species'
              },
              { 
                value: 'cow', 
                label: 'Cow/Buffalo',
                icon: <MaterialIcons name="pets" size={24} color={theme.colors.primary} />,
                description: 'Cattle or buffalo'
              },
              { 
                value: 'other', 
                label: 'Other',
                icon: <MaterialIcons name="pets" size={24} color={theme.colors.primary} />,
                description: 'Other animal types'
              },
            ]}
          />

          <GlassSelect
            label="Condition *"
            placeholder="Select condition"
            value={condition}
            onValueChange={setCondition}
            icon={<MaterialIcons name="medical-services" size={20} color={theme.colors.textSecondary} />}
            error={validationErrors.condition}
            options={[
              { 
                value: 'injured', 
                label: 'Injured',
                icon: <MaterialIcons name="healing" size={24} color={theme.colors.error} />,
                description: 'Physical injury or wound'
              },
              { 
                value: 'sick', 
                label: 'Sick',
                icon: <MaterialIcons name="sick" size={24} color={theme.colors.warning} />,
                description: 'Appears ill or unwell'
              },
              { 
                value: 'trapped', 
                label: 'Trapped',
                icon: <MaterialIcons name="lock" size={24} color={theme.colors.error} />,
                description: 'Stuck or confined'
              },
              { 
                value: 'lost', 
                label: 'Lost',
                icon: <MaterialIcons name="explore" size={24} color={theme.colors.secondary} />,
                description: 'Appears lost or abandoned'
              },
              { 
                value: 'aggressive', 
                label: 'Aggressive/Dangerous',
                icon: <MaterialIcons name="warning" size={24} color={theme.colors.error} />,
                description: 'Showing aggressive behavior'
              },
              { 
                value: 'starving', 
                label: 'Starving',
                icon: <MaterialIcons name="restaurant" size={24} color={theme.colors.warning} />,
                description: 'Malnourished or hungry'
              },
            ]}
          />

          <GlassInput
            label="Description *"
            placeholder="Describe what you see... (minimum 10 characters)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            error={validationErrors.description}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.locationButtons}>
            <GlassButton
              title="Pick Location"
              onPress={() => setShowLocationPicker(true)}
              variant="light"
              icon={<MaterialIcons name="my-location" size={18} color={theme.colors.textPrimary} />}
              style={{ flex: 1 }}
            />
            {locationCoords && (
              <View style={styles.locationBadge}>
                <MaterialIcons name="check-circle" size={16} color={theme.colors.success} />
                <Text style={styles.locationBadgeText}>GPS</Text>
              </View>
            )}
          </View>

          <GlassInput
            label="Address *"
            placeholder="Select location using button above"
            value={location}
            onChangeText={setLocation}
            error={validationErrors.location}
            multiline
            numberOfLines={2}
          />

          <GlassInput
            label="Landmark (Optional)"
            placeholder="Near Metro Station, Park..."
            value={landmark}
            onChangeText={setLandmark}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Contact</Text>
          
          <GlassInput
            label="Name *"
            placeholder="Your name"
            value={contactName}
            onChangeText={setContactName}
            error={validationErrors.contactName}
          />

          <GlassInput
            label="Phone Number *"
            placeholder="+91 XXXXX XXXXX"
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
            error={validationErrors.contactPhone}
          />

          <GlassInput
            label="Email (Optional)"
            placeholder="your.email@example.com"
            value={contactEmail}
            onChangeText={setContactEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={validationErrors.contactEmail}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos (Optional)</Text>
          <Text style={styles.sectionSubtitle}>
            Add up to {config.MAX_IMAGES_PER_REPORT} photos to help volunteers understand the situation
          </Text>
          <PhotoManager
            photos={photos}
            onPhotosChange={setPhotos}
            maxPhotos={config.MAX_IMAGES_PER_REPORT}
            required={false}
          />
        </View>

        <View style={styles.actionButtons}>
          <GlassButton
            title="Clear Form"
            onPress={handleClearForm}
            variant="light"
            size="large"
            style={{ flex: 1 }}
          />
          <GlassButton
            title="Submit Report"
            onPress={handleSubmit}
            loading={loading}
            variant="accent"
            size="large"
            style={{ flex: 2 }}
          />
        </View>

        <Text style={styles.requiredNote}>* Required fields</Text>
      </ScrollView>

      <Modal
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        title="Select Location"
        size="large"
      >
        <LocationPicker
          onLocationSelect={handleLocationSelect}
          initialLocation={locationCoords}
        />
      </Modal>

      <ConfirmDialog
        visible={showSubmitDialog}
        onClose={() => setShowSubmitDialog(false)}
        onConfirm={confirmSubmit}
        title="Submit Report"
        message="Are you sure you want to submit this report? Nearby volunteers will be notified immediately."
        confirmText="Submit"
        cancelText="Review"
        type="success"
      />

      <Modal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Report Submitted!"
        size="small"
        showCloseButton={false}
      >
        <View style={styles.modalContent}>
          <MaterialIcons name="check-circle" size={64} color={theme.colors.success} />
          <Text style={styles.successTitle}>Success!</Text>
          <Text style={styles.modalText}>
            Your report has been submitted successfully. Nearby volunteers and NGOs will be notified immediately.
          </Text>
          <Text style={styles.modalSubtext}>
            You will receive updates via phone and email as helpers respond to your case.
          </Text>
          <GlassButton
            title="Done"
            onPress={() => setShowSuccessModal(false)}
            variant="success"
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    // Dynamic padding applied inline
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.regular,
  },
  draftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.warning + '20',
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  draftText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning,
    fontWeight: theme.typography.fontWeight.medium,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  locationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.success + '20',
    borderRadius: theme.borderRadius.sm,
  },
  locationBadgeText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.success,
    fontWeight: theme.typography.fontWeight.medium,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  requiredNote: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalContent: {
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  modalText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  successTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.success,
  },
});
