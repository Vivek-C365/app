/**
 * Report Animal Screen
 * Allows users to report animals in need
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { theme } from '../theme';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';

export default function ReportScreen() {
  const [animalType, setAnimalType] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [landmark, setLandmark] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);

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
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Input
          label="Animal Type *"
          placeholder="e.g., Dog, Cat, Bird, Cow"
          value={animalType}
          onChangeText={setAnimalType}
        />

        <Input
          label="Condition *"
          placeholder="e.g., Injured, Sick, Trapped"
          value={condition}
          onChangeText={setCondition}
        />

        <Input
          label="Description"
          placeholder="Describe the animal's condition..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <Input
          label="Location *"
          placeholder="Enter address or area"
          value={location}
          onChangeText={setLocation}
        />

        <Button
          title="📍 Get GPS Location"
          onPress={handleGetLocation}
          variant="outline"
          style={styles.locationButton}
        />

        <Input
          label="Nearby Landmark"
          placeholder="e.g., Near Metro Station, Park"
          value={landmark}
          onChangeText={setLandmark}
        />

        <Input
          label="Your Name *"
          placeholder="Enter your name"
          value={contactName}
          onChangeText={setContactName}
        />

        <Input
          label="Phone Number *"
          placeholder="Enter your phone number"
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
        />

        <Button
          title="📷 Add Photos"
          onPress={handleTakePhoto}
          variant="outline"
          style={styles.photoButton}
        />

        <Button
          title="🚨 Submit Emergency Report"
          onPress={handleSubmit}
          loading={loading}
          size="large"
          style={styles.submitButton}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  card: {
    margin: theme.spacing.md,
  },
  locationButton: {
    marginBottom: theme.spacing.md,
  },
  photoButton: {
    marginBottom: theme.spacing.lg,
  },
  submitButton: {
    marginTop: theme.spacing.md,
  },
});
