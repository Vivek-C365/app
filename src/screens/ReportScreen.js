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

export default function ReportScreen() {
  const [animalType, setAnimalType] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [landmark, setLandmark] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  const handleGetLocation = () => {
    Alert.alert('GPS Location', 'GPS integration will be implemented in the next task');
  };

  const handleTakePhoto = () => {
    Alert.alert('Camera', 'Camera integration will be implemented in the next task');
  };

  const handleSubmit = async () => {
    if (!animalType || !condition || !location || !contactName || !contactPhone) {
      Alert.alert('Required Fields', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    // API call will be implemented later
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Report submitted! Nearby volunteers will be notified.');
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

});
