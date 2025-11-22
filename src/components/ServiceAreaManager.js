/**
 * Service Area Manager Component
 * Allows helpers to manage their service areas
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  getHelperServiceAreas,
  upsertServiceArea,
  deactivateServiceArea,
  activateServiceArea,
  getCurrentLocation,
  reverseGeocode,
} from '../services/locationService';

const ServiceAreaManager = ({ helperId, onUpdate }) => {
  const [serviceAreas, setServiceAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadServiceAreas();
  }, [helperId]);

  const loadServiceAreas = async () => {
    try {
      setLoading(true);
      const areas = await getHelperServiceAreas(helperId);
      setServiceAreas(areas);
    } catch (error) {
      console.error('Error loading service areas:', error);
      Alert.alert('Error', 'Failed to load service areas');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCurrentLocation = async () => {
    try {
      setActionLoading(true);

      // Get current location
      const location = await getCurrentLocation();
      const address = await reverseGeocode(location.latitude, location.longitude);

      if (!address) {
        Alert.alert('Error', 'Could not determine your location address');
        return;
      }

      // Prompt for radius
      Alert.prompt(
        'Service Area Radius',
        'Enter radius in kilometers (default: 10km)',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Add',
            onPress: async (radiusText) => {
              const radius = parseFloat(radiusText) || 10;
              
              try {
                await upsertServiceArea(
                  helperId,
                  location.latitude,
                  location.longitude,
                  radius,
                  address.city || 'Unknown',
                  address.region || 'Unknown'
                );

                Alert.alert('Success', 'Service area added successfully');
                loadServiceAreas();
                onUpdate?.();
              } catch (error) {
                console.error('Error adding service area:', error);
                Alert.alert('Error', 'Failed to add service area');
              }
            },
          },
        ],
        'plain-text',
        '10'
      );
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleArea = async (area) => {
    try {
      setActionLoading(true);

      if (area.is_active) {
        await deactivateServiceArea(area.id);
        Alert.alert('Success', 'Service area deactivated');
      } else {
        await activateServiceArea(area.id);
        Alert.alert('Success', 'Service area activated');
      }

      loadServiceAreas();
      onUpdate?.();
    } catch (error) {
      console.error('Error toggling service area:', error);
      Alert.alert('Error', 'Failed to update service area');
    } finally {
      setActionLoading(false);
    }
  };

  const renderServiceArea = ({ item }) => (
    <View style={styles.areaCard}>
      <View style={styles.areaHeader}>
        <Text style={styles.areaTitle}>
          {item.city}, {item.state}
        </Text>
        <View style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={styles.statusText}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.areaDetails}>
        <Text style={styles.detailText}>
          Radius: {item.radius_km} km
        </Text>
        <Text style={styles.detailText}>
          Center: {item.center_lat.toFixed(4)}, {item.center_lng.toFixed(4)}
        </Text>
        <Text style={styles.detailText}>
          Added: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.toggleButton, item.is_active ? styles.deactivateButton : styles.activateButton]}
        onPress={() => handleToggleArea(item)}
        disabled={actionLoading}
      >
        <Text style={styles.toggleButtonText}>
          {item.is_active ? 'Deactivate' : 'Activate'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading service areas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Service Areas</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddCurrentLocation}
          disabled={actionLoading}
        >
          <Text style={styles.addButtonText}>+ Add Current Location</Text>
        </TouchableOpacity>
      </View>

      {serviceAreas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No service areas defined</Text>
          <Text style={styles.emptySubtext}>
            Add your current location to start receiving case notifications
          </Text>
        </View>
      ) : (
        <FlatList
          data={serviceAreas}
          renderItem={renderServiceArea}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  areaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  areaTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#4CAF50',
  },
  inactiveBadge: {
    backgroundColor: '#9E9E9E',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  areaDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  toggleButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activateButton: {
    backgroundColor: '#4CAF50',
  },
  deactivateButton: {
    backgroundColor: '#FF9800',
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default ServiceAreaManager;
