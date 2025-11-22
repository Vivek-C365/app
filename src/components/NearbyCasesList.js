/**
 * Nearby Cases List Component
 * Displays cases near the helper's location
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { findNearbyCases } from '../services/locationService';

const NearbyCasesList = ({ helperId, onCasePress, radiusKm = 10 }) => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNearbyCases();
  }, [helperId, radiusKm]);

  const loadNearbyCases = async () => {
    try {
      setLoading(true);
      const nearbyCases = await findNearbyCases(helperId, radiusKm, 20);
      setCases(nearbyCases);
    } catch (error) {
      console.error('Error loading nearby cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNearbyCases();
    setRefreshing(false);
  };

  const getUrgencyColor = (urgencyLevel) => {
    switch (urgencyLevel) {
      case 'critical':
        return '#D32F2F';
      case 'high':
        return '#F57C00';
      case 'medium':
        return '#FBC02D';
      case 'low':
        return '#388E3C';
      default:
        return '#757575';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return '#2196F3';
      case 'assigned':
        return '#FF9800';
      case 'in_progress':
        return '#9C27B0';
      case 'resolved':
        return '#4CAF50';
      default:
        return '#757575';
    }
  };

  const renderCase = ({ item }) => (
    <TouchableOpacity
      style={styles.caseCard}
      onPress={() => onCasePress?.(item)}
    >
      {item.photos && item.photos.length > 0 && (
        <Image
          source={{ uri: item.photos[0] }}
          style={styles.caseImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.caseContent}>
        <View style={styles.caseHeader}>
          <Text style={styles.animalType}>{item.animal_type}</Text>
          <View style={styles.badges}>
            <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(item.urgency_level) }]}>
              <Text style={styles.badgeText}>{item.urgency_level}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.condition} numberOfLines={2}>
          {item.condition}
        </Text>

        <View style={styles.locationContainer}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location_landmarks || item.location_address || 'Location not specified'}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.distanceContainer}>
            <Text style={styles.distanceIcon}>🚗</Text>
            <Text style={styles.distanceText}>{item.distance_km} km away</Text>
          </View>
          <Text style={styles.timeText}>
            {formatTimeAgo(item.created_at)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Finding nearby cases...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Cases</Text>
        <Text style={styles.subtitle}>Within {radiusKm} km</Text>
      </View>

      {cases.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>No cases nearby</Text>
          <Text style={styles.emptySubtext}>
            There are no active cases within {radiusKm} km of your location
          </Text>
        </View>
      ) : (
        <FlatList
          data={cases}
          renderItem={renderCase}
          keyExtractor={(item) => item.case_id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
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
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  caseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  caseImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#e0e0e0',
  },
  caseContent: {
    padding: 16,
  },
  caseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  animalType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  condition: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
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

export default NearbyCasesList;
