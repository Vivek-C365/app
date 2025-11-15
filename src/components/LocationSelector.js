/**
 * LocationSelector Component
 * Combines GPS location picker and landmark-based input
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LocationPicker from './LocationPicker';
import LandmarkLocationInput from './LandmarkLocationInput';
import {
  checkLocationPermission,
  requestLocationPermission,
  getNearbyLandmarks
} from '../services/locationService';

const LOCATION_METHODS = {
  GPS: 'gps',
  LANDMARK: 'landmark'
};

const LocationSelector = ({
  onLocationChange,
  initialLocation = null,
  showMethodToggle = true,
  defaultMethod = LOCATION_METHODS.GPS
}) => {
  const [selectedMethod, setSelectedMethod] = useState(defaultMethod);
  const [locationData, setLocationData] = useState(initialLocation || null);
  const [hasGPSPermission, setHasGPSPermission] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [suggestedLandmarks, setSuggestedLandmarks] = useState([]);

  useEffect(() => {
    checkGPSPermission();
  }, []);

  useEffect(() => {
    if (onLocationChange && locationData) {
      onLocationChange(locationData);
    }
  }, [locationData]);

  const checkGPSPermission = async () => {
    setCheckingPermission(true);
    try {
      const hasPermission = await checkLocationPermission();
      setHasGPSPermission(hasPermission);
      
      if (!hasPermission && selectedMethod === LOCATION_METHODS.GPS) {
        setSelectedMethod(LOCATION_METHODS.LANDMARK);
      }
    } catch (error) {
      console.error('Error checking GPS permission:', error);
      setHasGPSPermission(false);
    } finally {
      setCheckingPermission(false);
    }
  };

  const handleMethodChange = async (method) => {
    if (method === LOCATION_METHODS.GPS) {
      if (!hasGPSPermission) {
        const result = await requestLocationPermission();
        if (result.granted) {
          setHasGPSPermission(true);
          setSelectedMethod(method);
        } else {
          Alert.alert(
            'GPS Permission Required',
            'Please enable location permissions to use GPS.',
            [{ text: 'OK' }]
          );
        }
      } else {
        setSelectedMethod(method);
      }
    } else {
      setSelectedMethod(method);
    }
  };

  const handleGPSLocationSelect = async (location) => {
    try {
      const landmarks = await getNearbyLandmarks(location.latitude, location.longitude);
      
      const locationInfo = {
        method: LOCATION_METHODS.GPS,
        coordinates: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        address: location.address,
        accuracy: location.accuracy,
        isApproximate: false,
        isCached: location.isCached || false,
        landmarks: landmarks.map(l => l.name).join(', '),
        timestamp: Date.now()
      };
      
      setLocationData(locationInfo);
      setSuggestedLandmarks(landmarks);
    } catch (error) {
      console.error('Error handling GPS location:', error);
    }
  };

  const handleLandmarkLocationDescribe = (landmarkData) => {
    const locationInfo = {
      method: LOCATION_METHODS.LANDMARK,
      coordinates: null,
      nearestPlace: landmarkData.nearestPlace,
      landmarks: landmarkData.landmarks,
      directions: landmarkData.directions,
      address: landmarkData.address,
      city: landmarkData.city,
      state: landmarkData.state,
      isApproximate: true,
      description: landmarkData.description,
      timestamp: Date.now()
    };
    
    setLocationData(locationInfo);
  };

  if (checkingPermission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showMethodToggle && (
        <View style={styles.methodToggle}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              selectedMethod === LOCATION_METHODS.GPS && styles.methodButtonActive
            ]}
            onPress={() => handleMethodChange(LOCATION_METHODS.GPS)}
          >
            <Ionicons
              name="locate"
              size={20}
              color={selectedMethod === LOCATION_METHODS.GPS ? '#FFF' : '#4ECDC4'}
            />
            <Text
              style={[
                styles.methodButtonText,
                selectedMethod === LOCATION_METHODS.GPS && styles.methodButtonTextActive
              ]}
            >
              Use GPS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodButton,
              selectedMethod === LOCATION_METHODS.LANDMARK && styles.methodButtonActive
            ]}
            onPress={() => handleMethodChange(LOCATION_METHODS.LANDMARK)}
          >
            <Ionicons
              name="map-outline"
              size={20}
              color={selectedMethod === LOCATION_METHODS.LANDMARK ? '#FFF' : '#4ECDC4'}
            />
            <Text
              style={[
                styles.methodButtonText,
                selectedMethod === LOCATION_METHODS.LANDMARK && styles.methodButtonTextActive
              ]}
            >
              Use Landmarks
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.contentContainer}>
        {selectedMethod === LOCATION_METHODS.GPS ? (
          <View>
            <LocationPicker
              initialLocation={locationData?.coordinates}
              onLocationSelect={handleGPSLocationSelect}
              showCurrentLocationButton={true}
              height={400}
              editable={true}
            />
            
            {suggestedLandmarks.length > 0 && (
              <View style={styles.landmarksCard}>
                <Text style={styles.landmarksTitle}>Nearby Landmarks:</Text>
                {suggestedLandmarks.map((landmark, index) => (
                  <View key={index} style={styles.landmarkItem}>
                    <Ionicons name="location-outline" size={16} color="#4ECDC4" />
                    <Text style={styles.landmarkText}>
                      {landmark.name} ({landmark.distance})
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <LandmarkLocationInput
            onLocationDescribe={handleLandmarkLocationDescribe}
            initialData={locationData}
            showGPSOption={hasGPSPermission}
            onRequestGPS={() => handleMethodChange(LOCATION_METHODS.GPS)}
          />
        )}
      </View>

      {locationData && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.summaryTitle}>Location Selected</Text>
          </View>
          
          {locationData.method === LOCATION_METHODS.GPS ? (
            <View>
              <Text style={styles.summaryText}>
                📍 {locationData.address || 'Location captured'}
              </Text>
              {locationData.isCached && (
                <Text style={styles.warningText}>
                  ⚠️ Using cached location
                </Text>
              )}
            </View>
          ) : (
            <View>
              {locationData.nearestPlace && (
                <Text style={styles.summaryText}>
                  📍 Near: {locationData.nearestPlace}
                </Text>
              )}
              {locationData.city && (
                <Text style={styles.summaryText}>
                  🏙️ City: {locationData.city}
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  methodButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  methodButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#4ECDC4',
  },
  methodButtonTextActive: {
    color: '#FFF',
  },
  contentContainer: {
    flex: 1,
  },
  landmarksCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  landmarksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  landmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  landmarkText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  summaryCard: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 13,
    color: '#F57C00',
    marginTop: 8,
  },
});

export default LocationSelector;
