/**
 * Report Animal Screen
 * Allows users to report animals in need
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ReportScreen() {
  const [animalType, setAnimalType] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [landmark, setLandmark] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  const handleGetLocation = () => {
    setShowLocationModal(true);
  };

  const handleTakePhoto = () => {
    setShowPhotoModal(true);
  };

  const handleSubmit = async () => {
    if (!animalType || !condition || !location || !contactName || !contactPhone) {
      Alert.alert('Required Fields', 'Please fill all required fields');
      return;
    }

    setShowSubmitDialog(true);
  };

  const confirmSubmit = () => {
    setLoading(true);
    // API call will be implemented later
    setTimeout(() => {
      setLoading(false);
      setShowSuccessModal(true);
      // Reset form
      setAnimalType('');
      setCondition('');
      setDescription('');
      setLocation('');
      setLandmark('');
      setContactName('');
      setContactPhone('');
    }, 1000);
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Animal Information</Text>
          
          <GlassInput
            label="Animal Type"
            placeholder="Dog, Cat, Bird, Cow..."
            value={animalType}
            onChangeText={setAnimalType}
          />

          <GlassInput
            label="Condition"
            placeholder="Injured, Sick, Trapped..."
            value={condition}
            onChangeText={setCondition}
          />

          <GlassInput
            label="Description"
            placeholder="Describe what you see..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <GlassInput
            label="Address"
            placeholder="Enter location"
            value={location}
            onChangeText={setLocation}
          />

          <GlassButton
            title="Use Current Location"
            onPress={handleGetLocation}
            variant="light"
            icon={<MaterialIcons name="my-location" size={18} color={theme.colors.textPrimary} />}
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
            label="Name"
            placeholder="Your name"
            value={contactName}
            onChangeText={setContactName}
          />

          <GlassInput
            label="Phone Number"
            placeholder="+91 XXXXX XXXXX"
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.section}>
          <GlassButton
            title="Add Photos"
            onPress={handleTakePhoto}
            variant="light"
            icon={<MaterialIcons name="add-a-photo" size={18} color={theme.colors.textPrimary} />}
          />
        </View>

        <GlassButton
          title="Submit Report"
          onPress={handleSubmit}
          loading={loading}
          variant="accent"
          size="large"
        />
      </ScrollView>

      <Modal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title="GPS Location"
        size="small"
      >
        <View style={styles.modalContent}>
          <MaterialIcons name="location-searching" size={48} color={theme.colors.primary} />
          <Text style={styles.modalText}>
            GPS integration will be implemented in the next task. This will automatically detect your current location.
          </Text>
          <GlassButton
            title="Got it"
            onPress={() => setShowLocationModal(false)}
            variant="primary"
          />
        </View>
      </Modal>

      <Modal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        title="Add Photos"
        size="small"
      >
        <View style={styles.modalContent}>
          <MaterialIcons name="add-a-photo" size={48} color={theme.colors.primary} />
          <Text style={styles.modalText}>
            Camera integration will be implemented in the next task. You'll be able to take photos or select from gallery.
          </Text>
          <GlassButton
            title="Got it"
            onPress={() => setShowPhotoModal(false)}
            variant="primary"
          />
        </View>
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
            Your report has been submitted successfully. Nearby volunteers will be notified and will reach out to you soon.
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
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
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
  successTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.success,
  },
});
