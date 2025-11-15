/**
 * LocationPicker Component
 * Interactive map-based location picker with GPS integration
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import {
  getCurrentLocation,
  reverseGeocode,
  requestLocationPermission,
  getCachedLocation
} from '../services/locationService';

const LocationPicker = ({
  initialLocation = null,
  onLocationSelect,
  showCurrentLocationButton = true,
  height = 400,
  editable = true
}) => {
  const [region, setRegion] = useState({
    latitude: initialLocation?.latitude || 28.6139, // Default to Delhi
    longitude: initialLocation?.longitude || 77.2090,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  
  const [markerPosition, setMarkerPosition] = useState(
    initialLocation ? {
      latitude: initialLocation.latitude,
      longitude: initialLocation.longitude
    } : null
  );
  
  const [address, setAddress] = useState(initialLocation?.address || '');
  const [loading, setLoading] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  const mapRef = useRef(null);

  useEffect(() => {
    checkPermissions();
    
    // If no initial location, try to get current location
    if (!initialLocation && showCurrentLocationButton) {
      handleGetCurrentLocation();
    }
  }, []);

  const checkPermissions = async () => {
    const result = await requestLocationPermission();
    setPermissionGranted(result.granted);
  };

  const handleGetCurrentLocation = async () => {
    setLoading(true);
    try {
      const location = await getCurrentLocation();
      
      const newRegion = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      setRegion(newRegion);
      setMarkerPosition({
        latitude: location.latitude,
        longitude: location.longitude
      });
      
      // Animate to new region
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
      
      // Get address for this location
      const fetchedAddress = await fetchAddress(location.latitude, location.longitude);
      
      // Notify parent component with the fetched address
      if (onLocationSelect) {
        onLocationSelect({
          latitude: location.latitude,
          longitude: location.longitude,
          address: fetchedAddress,
          accuracy: location.accuracy,
          isCached: location.isCached || false
        });
      }
      
      if (location.isCached) {
        Alert.alert(
          'Using Cached Location',
          'GPS is unavailable. Using your last known location.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      
      // Try to use cached location
      const cached = await getCachedLocation();
      if (cached) {
        Alert.alert(
          'GPS Unavailable',
          'Using your last known location. You can adjust the marker on the map.',
          [{ text: 'OK' }]
        );
        
        const newRegion = {
          latitude: cached.latitude,
          longitude: cached.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        setRegion(newRegion);
        setMarkerPosition({
          latitude: cached.latitude,
          longitude: cached.longitude
        });
        
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
      } else {
        Alert.alert(
          'Location Error',
          'Unable to get your location. Please select your location on the map or enter it manually.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAddress = async (latitude, longitude) => {
    setLoadingAddress(true);
    try {
      const result = await reverseGeocode(latitude, longitude);
      if (result && result.formattedAddress) {
        setAddress(result.formattedAddress);
        return result.formattedAddress;
      }
      return 'Address unavailable';
    } catch (error) {
      console.error('Error fetching address:', error);
      setAddress('Address unavailable');
      return 'Address unavailable';
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleMapPress = async (event) => {
    if (!editable) return;
    
    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    setMarkerPosition({ latitude, longitude });
    
    // Fetch address for new location
    const fetchedAddress = await fetchAddress(latitude, longitude);
    
    // Notify parent component with the fetched address
    if (onLocationSelect) {
      onLocationSelect({
        latitude,
        longitude,
        address: fetchedAddress,
        isManual: true
      });
    }
  };

  const handleMarkerDragEnd = async (event) => {
    if (!editable) return;
    
    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    setMarkerPosition({ latitude, longitude });
    
    // Fetch address for new location
    const fetchedAddress = await fetchAddress(latitude, longitude);
    
    // Notify parent component with the fetched address
    if (onLocationSelect) {
      onLocationSelect({
        latitude,
        longitude,
        address: fetchedAddress,
        isManual: true
      });
    }
  };

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        region={region}
        onRegionChangeComplete={setRegion}
        onPress={handleMapPress}
        showsUserLocation={permissionGranted}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        {markerPosition && (
          <Marker
            coordinate={markerPosition}
            draggable={editable}
            onDragEnd={handleMarkerDragEnd}
            title="Selected Location"
            description={address || 'Drag to adjust'}
          >
            <View style={styles.markerContainer}>
              <Ionicons name="location" size={40} color="#FF6B6B" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Current Location Button */}
      {showCurrentLocationButton && editable && (
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={handleGetCurrentLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="locate" size={24} color="#FFF" />
          )}
        </TouchableOpacity>
      )}

      {/* Address Display */}
      <View style={styles.addressContainer}>
        {loadingAddress ? (
          <View style={styles.addressLoading}>
            <ActivityIndicator size="small" color="#4ECDC4" />
            <Text style={styles.addressLoadingText}>Getting address...</Text>
          </View>
        ) : (
          <>
            <Ionicons name="location-outline" size={20} color="#4ECDC4" />
            <Text style={styles.addressText} numberOfLines={2}>
              {address || 'Tap on the map to select a location'}
            </Text>
          </>
        )}
      </View>

      {/* Instructions */}
      {editable && (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            Tap on the map or drag the marker to adjust location
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  map: {
    flex: 1,
  },
  currentLocationButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    backgroundColor: '#4ECDC4',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  addressLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  addressText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  instructionsContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 8,
  },
  instructionsText: {
    color: '#FFF',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default LocationPicker;
