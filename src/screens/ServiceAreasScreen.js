/**
 * Service Areas Screen
 * Manage service areas for volunteers and NGOs
 */
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import { supabase } from '../config/supabase';
import toast from '../utils/toast';

export default function ServiceAreasScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [serviceAreas, setServiceAreas] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState(null);
  const [formData, setFormData] = useState({
    city: '',
    state: '',
    radius_km: '10',
    latitude: null,
    longitude: null,
  });
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchServiceAreas();
  }, []);

  const fetchServiceAreas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_areas')
        .select('*')
        .eq('helper_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setServiceAreas(data || []);
    } catch (error) {
      console.error('Error fetching service areas:', error);
      toast.error('Error', 'Failed to load service areas');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Permission Denied', 'Location permission is required');
        return;
      }

      toast.info('Getting Location', 'Fetching your current location...');
      const location = await Location.getCurrentPositionAsync({});
      
      setFormData({
        ...formData,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Reverse geocode to get city and state
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode && geocode.length > 0) {
        setFormData({
          ...formData,
          city: geocode[0].city || geocode[0].subregion || '',
          state: geocode[0].region || '',
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }

      toast.success('Success', 'Location detected successfully');
    } catch (error) {
      console.error('Error getting location:', error);
      toast.error('Error', 'Failed to get current location');
    }
  };

  const handleAddServiceArea = async () => {
    // Validate inputs
    if (!formData.city.trim() || !formData.state.trim()) {
      toast.error('Validation Error', 'City and state are required');
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      toast.error('Validation Error', 'Please use current location or enter coordinates');
      return;
    }

    const radius = parseFloat(formData.radius_km);
    if (isNaN(radius) || radius <= 0 || radius > 100) {
      toast.error('Validation Error', 'Radius must be between 1 and 100 km');
      return;
    }

    try {
      setLoading(true);

      // Create PostGIS point
      const { data, error } = await supabase
        .from('service_areas')
        .insert({
          helper_id: user.id,
          center_point: `POINT(${formData.longitude} ${formData.latitude})`,
          radius_km: radius,
          city: formData.city.trim(),
          state: formData.state.trim(),
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Success', 'Service area added successfully');
      setServiceAreas([data, ...serviceAreas]);
      setShowAddForm(false);
      setFormData({
        city: '',
        state: '',
        radius_km: '10',
        latitude: null,
        longitude: null,
      });
    } catch (error) {
      console.error('Error adding service area:', error);
      toast.error('Error', 'Failed to add service area');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteServiceArea = (area) => {
    setAreaToDelete(area);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!areaToDelete) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('service_areas')
        .update({ is_active: false })
        .eq('id', areaToDelete.id);

      if (error) throw error;

      toast.success('Success', 'Service area removed');
      setServiceAreas(serviceAreas.filter((area) => area.id !== areaToDelete.id));
      setDeleteDialogVisible(false);
      setAreaToDelete(null);
    } catch (error) {
      console.error('Error deleting service area:', error);
      toast.error('Error', 'Failed to remove service area');
    } finally {
      setLoading(false);
    }
  };

  if (loading && serviceAreas.length === 0) {
    return <LoadingSpinner fullScreen message="Loading service areas..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 140,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <MaterialIcons name="location-on" size={48} color={theme.colors.primary} />
          <Text style={styles.title}>Service Areas</Text>
          <Text style={styles.subtitle}>
            Define areas where you can help with animal rescues
          </Text>
        </View>

        {!showAddForm && (
          <View style={styles.addButtonContainer}>
            <GlassButton
              title="Add Service Area"
              onPress={() => setShowAddForm(true)}
              variant="primary"
              icon="add"
              intensity={85}
            />
          </View>
        )}

        {showAddForm && (
          <GlassCard variant="light" intensity={80} style={styles.formCard}>
            <Text style={styles.formTitle}>Add New Service Area</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City *</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="location-city"
                  size={20}
                  color={theme.colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(text) => setFormData({ ...formData, city: text })}
                  placeholder="Enter city name"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>State *</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="map"
                  size={20}
                  color={theme.colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.state}
                  onChangeText={(text) => setFormData({ ...formData, state: text })}
                  placeholder="Enter state name"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Radius (km) *</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="radio-button-unchecked"
                  size={20}
                  color={theme.colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.radius_km}
                  onChangeText={(text) => setFormData({ ...formData, radius_km: text })}
                  placeholder="10"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <GlassButton
              title="Use Current Location"
              onPress={getCurrentLocation}
              variant="secondary"
              icon="my-location"
              intensity={75}
              style={styles.locationButton}
            />

            {formData.latitude && formData.longitude && (
              <View style={styles.coordinatesBox}>
                <MaterialIcons name="check-circle" size={16} color={theme.colors.success} />
                <Text style={styles.coordinatesText}>
                  Location set: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                </Text>
              </View>
            )}

            <View style={styles.formActions}>
              <GlassButton
                title="Add Area"
                onPress={handleAddServiceArea}
                variant="primary"
                style={styles.formActionButton}
                intensity={85}
              />
              <GlassButton
                title="Cancel"
                onPress={() => {
                  setShowAddForm(false);
                  setFormData({
                    city: '',
                    state: '',
                    radius_km: '10',
                    latitude: null,
                    longitude: null,
                  });
                }}
                variant="light"
                style={styles.formActionButton}
                intensity={75}
              />
            </View>
          </GlassCard>
        )}

        {serviceAreas.length === 0 && !showAddForm ? (
          <GlassCard variant="light" intensity={80} style={styles.emptyCard}>
            <MaterialIcons name="location-off" size={64} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Service Areas</Text>
            <Text style={styles.emptyText}>
              Add service areas to receive notifications about animal rescues in your area
            </Text>
          </GlassCard>
        ) : (
          <View style={styles.areasList}>
            {serviceAreas.map((area) => (
              <GlassCard key={area.id} variant="secondary" intensity={80} style={styles.areaCard}>
                <View style={styles.areaHeader}>
                  <View style={styles.areaInfo}>
                    <Text style={styles.areaCity}>{area.city}</Text>
                    <Text style={styles.areaState}>{area.state}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteServiceArea(area)}
                    style={styles.deleteButton}
                  >
                    <MaterialIcons name="delete" size={24} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
                <View style={styles.areaDetails}>
                  <View style={styles.areaDetailItem}>
                    <MaterialIcons
                      name="radio-button-unchecked"
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.areaDetailText}>Radius: {area.radius_km} km</Text>
                  </View>
                  <View style={styles.areaDetailItem}>
                    <MaterialIcons name="check-circle" size={16} color={theme.colors.success} />
                    <Text style={styles.areaDetailText}>Active</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={deleteDialogVisible}
        onClose={() => {
          setDeleteDialogVisible(false);
          setAreaToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Remove Service Area"
        message="Are you sure you want to remove this service area? You will no longer receive notifications for cases in this area."
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
      />
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
    alignItems: 'center',
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  addButtonContainer: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  formCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  formTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
  },
  locationButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  coordinatesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.successBackground,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  coordinatesText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.success,
  },
  formActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  formActionButton: {
    flex: 1,
    marginBottom: 0,
  },
  emptyCard: {
    marginHorizontal: theme.spacing.md,
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  areasList: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  areaCard: {
    marginBottom: theme.spacing.md,
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  areaInfo: {
    flex: 1,
  },
  areaCity: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  areaState: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  deleteButton: {
    padding: theme.spacing.sm,
  },
  areaDetails: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  areaDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  areaDetailText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});
