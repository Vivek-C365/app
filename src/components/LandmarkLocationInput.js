/**
 * LandmarkLocationInput Component
 * Allows users to describe location using landmarks when GPS is unavailable
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANDMARK_HISTORY_KEY = '@landmark_history';

const LandmarkLocationInput = ({
  onLocationDescribe,
  initialData = null,
  showGPSOption = true,
  onRequestGPS
}) => {
  const [nearestPlace, setNearestPlace] = useState(initialData?.nearestPlace || '');
  const [landmarks, setLandmarks] = useState(initialData?.landmarks || '');
  const [directions, setDirections] = useState(initialData?.directions || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [state, setState] = useState(initialData?.state || 'India');
  const [landmarkSuggestions, setLandmarkSuggestions] = useState([]);

  useEffect(() => {
    loadLandmarkHistory();
  }, []);

  useEffect(() => {
    // Notify parent component when data changes
    if (onLocationDescribe) {
      const locationData = {
        nearestPlace,
        landmarks,
        directions,
        address,
        city,
        state,
        isApproximate: true,
        description: buildLocationDescription()
      };
      onLocationDescribe(locationData);
    }
  }, [nearestPlace, landmarks, directions, address, city, state]);

  const loadLandmarkHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(LANDMARK_HISTORY_KEY);
      if (history) {
        setLandmarkSuggestions(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading landmark history:', error);
    }
  };

  const saveLandmarkToHistory = async (landmark) => {
    try {
      const history = await AsyncStorage.getItem(LANDMARK_HISTORY_KEY);
      let suggestions = history ? JSON.parse(history) : [];
      
      // Add new landmark if not already in history
      if (!suggestions.includes(landmark) && landmark.trim()) {
        suggestions.unshift(landmark);
        // Keep only last 10 landmarks
        suggestions = suggestions.slice(0, 10);
        await AsyncStorage.setItem(LANDMARK_HISTORY_KEY, JSON.stringify(suggestions));
        setLandmarkSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Error saving landmark to history:', error);
    }
  };

  const buildLocationDescription = () => {
    const parts = [];
    
    if (nearestPlace) parts.push(`Near ${nearestPlace}`);
    if (landmarks) parts.push(`Landmarks: ${landmarks}`);
    if (directions) parts.push(`Directions: ${directions}`);
    if (address) parts.push(address);
    if (city) parts.push(city);
    if (state) parts.push(state);
    
    return parts.filter(Boolean).join(', ');
  };

  const handleNearestPlaceSubmit = () => {
    if (nearestPlace.trim()) {
      saveLandmarkToHistory(nearestPlace);
    }
  };

  const handleSuggestionPress = (suggestion) => {
    setNearestPlace(suggestion);
  };

  const validateAndSubmit = () => {
    if (!nearestPlace && !landmarks && !address) {
      Alert.alert(
        'Incomplete Information',
        'Please provide at least one of: nearest place, landmarks, or address',
        [{ text: 'OK' }]
      );
      return false;
    }

    if (!city) {
      Alert.alert(
        'City Required',
        'Please enter the city name',
        [{ text: 'OK' }]
      );
      return false;
    }

    return true;
  };

  const commonLandmarks = [
    'Hospital',
    'School',
    'Temple',
    'Mosque',
    'Church',
    'Market',
    'Bus Stop',
    'Railway Station',
    'Police Station',
    'Post Office',
    'Bank',
    'Park',
    'Mall',
    'Restaurant',
    'Petrol Pump'
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* GPS Option */}
      {showGPSOption && onRequestGPS && (
        <TouchableOpacity
          style={styles.gpsButton}
          onPress={onRequestGPS}
        >
          <Ionicons name="locate" size={24} color="#4ECDC4" />
          <Text style={styles.gpsButtonText}>Use GPS Instead</Text>
        </TouchableOpacity>
      )}

      {/* Instructions */}
      <View style={styles.instructionsCard}>
        <Ionicons name="information-circle" size={24} color="#4ECDC4" />
        <Text style={styles.instructionsText}>
          Help us locate the animal by describing the location using nearby landmarks and places
        </Text>
      </View>

      {/* Nearest Known Place */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Nearest Known Place <Text style={styles.required}>*</Text>
        </Text>
        <Text style={styles.hint}>
          e.g., "City Hospital", "Central Market", "Railway Station"
        </Text>
        <TextInput
          style={styles.input}
          value={nearestPlace}
          onChangeText={setNearestPlace}
          onBlur={handleNearestPlaceSubmit}
          placeholder="Enter nearest known place"
          placeholderTextColor="#999"
        />
        
        {/* Recent Landmarks */}
        {landmarkSuggestions.length > 0 && !nearestPlace && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Recent:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {landmarkSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionChip}
                  onPress={() => handleSuggestionPress(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Common Landmarks Quick Select */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Common Landmarks</Text>
        <View style={styles.chipsContainer}>
          {commonLandmarks.map((landmark, index) => (
            <TouchableOpacity
              key={index}
              style={styles.landmarkChip}
              onPress={() => setNearestPlace(landmark)}
            >
              <Text style={styles.landmarkChipText}>{landmark}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Specific Landmarks */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Specific Landmarks <Text style={styles.required}>*</Text>
        </Text>
        <Text style={styles.hint}>
          Describe visible landmarks: shops, buildings, signs, etc.
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={landmarks}
          onChangeText={setLandmarks}
          placeholder="e.g., 'Near Sharma Medical Store, opposite Blue Building'"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Directions from Landmark */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Directions from Landmark</Text>
        <Text style={styles.hint}>
          How to reach from the nearest place
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={directions}
          onChangeText={setDirections}
          placeholder="e.g., '100 meters north, take first left after the temple'"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Street Address (Optional) */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Street Address (if known)</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Enter street address"
          placeholderTextColor="#999"
        />
      </View>

      {/* City */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          City <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Enter city name"
          placeholderTextColor="#999"
        />
      </View>

      {/* State */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>State</Text>
        <TextInput
          style={styles.input}
          value={state}
          onChangeText={setState}
          placeholder="Enter state name"
          placeholderTextColor="#999"
        />
      </View>

      {/* Location Preview */}
      {buildLocationDescription() && (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Location Description:</Text>
          <Text style={styles.previewText}>{buildLocationDescription()}</Text>
        </View>
      )}

      {/* Tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Tips for better location description:</Text>
        <Text style={styles.tipText}>• Mention well-known places like hospitals, schools, or markets</Text>
        <Text style={styles.tipText}>• Include shop names or building colors if visible</Text>
        <Text style={styles.tipText}>• Provide approximate distance and direction</Text>
        <Text style={styles.tipText}>• Take photos of surroundings to help identify location</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    borderStyle: 'dashed',
  },
  gpsButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#4ECDC4',
  },
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  instructionsText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  required: {
    color: '#FF6B6B',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  suggestionsContainer: {
    marginTop: 8,
  },
  suggestionsTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  suggestionChip: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: '#1976D2',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  landmarkChip: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#4ECDC4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  landmarkChipText: {
    fontSize: 14,
    color: '#4ECDC4',
  },
  previewCard: {
    backgroundColor: '#FFF9C4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FBC02D',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57F17',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#2E7D32',
    marginBottom: 4,
    lineHeight: 18,
  },
});

export default LandmarkLocationInput;
