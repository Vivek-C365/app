/**
 * Search Screen
 * Search for animal rescue cases
 */
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import GlassCard from '../components/GlassCard';
import AnimalCard from '../components/AnimalCard';
import StatusBadge from '../components/StatusBadge';
import BottomSheet from '../components/BottomSheet';
import GlassButton from '../components/GlassButton';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [customFilters, setCustomFilters] = useState({
    animalType: 'all',
    status: 'all',
    distance: 10,
    urgency: 'all',
    dateRange: 'all',
    hasPhoto: false,
  });
  const insets = useSafeAreaInsets();

  const filters = [
    { id: 'all', label: 'All', icon: 'pets' },
    { id: 'dog', label: 'Dogs', icon: 'pets' },
    { id: 'cat', label: 'Cats', icon: 'pets' },
    { id: 'bird', label: 'Birds', icon: 'flutter-dash' },
    { id: 'urgent', label: 'Urgent', icon: 'warning' },
  ];

  const recentSearches = [
    'Injured dog Mumbai',
    'Cat rescue Delhi',
    'Bird trapped',
  ];

  const searchResults = [
    {
      id: 'AR-2024-004',
      name: 'Max',
      type: 'Dog',
      status: 'Active',
      location: 'Bandra, Mumbai',
      time: '1h ago',
      condition: 'Lost and scared',
      imageUrl: null,
    },
    {
      id: 'AR-2024-005',
      name: 'Whiskers',
      type: 'Cat',
      status: 'Assigned',
      location: 'Powai, Mumbai',
      time: '3h ago',
      condition: 'Needs medical attention',
      imageUrl: null,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 140,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Header */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={24} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search cases, location, animal type..."
              placeholderTextColor={theme.colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <MaterialIcons name="tune" size={24} color={theme.colors.textPrimary} />
            {Object.values(customFilters).some(v => v !== 'all' && v !== 10 && v !== false) && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {Object.values(customFilters).filter(v => v !== 'all' && v !== 10 && v !== false).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                selectedFilter === filter.id && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(filter.id)}
            >
              <MaterialIcons
                name={filter.icon}
                size={18}
                color={
                  selectedFilter === filter.id
                    ? theme.colors.white
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter.id && styles.filterTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recent Searches */}
        {searchQuery.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            {recentSearches.map((search, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recentItem}
                onPress={() => setSearchQuery(search)}
              >
                <MaterialIcons name="history" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.recentText}>{search}</Text>
                <MaterialIcons name="north-west" size={16} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Stats */}
        {searchQuery.length === 0 && (
          <GlassCard variant="primary" style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialIcons name="pets" size={24} color={theme.colors.primary} />
                <Text style={styles.statValue}>45</Text>
                <Text style={styles.statLabel}>Active Cases</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialIcons name="location-on" size={24} color={theme.colors.primary} />
                <Text style={styles.statValue}>10km</Text>
                <Text style={styles.statLabel}>Radius</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialIcons name="people" size={24} color={theme.colors.primary} />
                <Text style={styles.statValue}>23</Text>
                <Text style={styles.statLabel}>Volunteers</Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Search Results */}
        {searchQuery.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {searchResults.length} Results Found
            </Text>
            {searchResults.map((caseItem) => (
              <AnimalCard
                key={caseItem.id}
                {...caseItem}
                onPress={() => {}}
                onHelp={() => {}}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Custom Filter Modal */}
      <BottomSheet
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter Cases"
        height="large"
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Animal Type */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Animal Type</Text>
            <View style={styles.filterOptions}>
              {['all', 'dog', 'cat', 'bird', 'other'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterOption,
                    customFilters.animalType === type && styles.filterOptionActive,
                  ]}
                  onPress={() => setCustomFilters({ ...customFilters, animalType: type })}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      customFilters.animalType === type && styles.filterOptionTextActive,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Case Status</Text>
            <View style={styles.filterOptions}>
              {['all', 'active', 'assigned', 'resolved'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterOption,
                    customFilters.status === status && styles.filterOptionActive,
                  ]}
                  onPress={() => setCustomFilters({ ...customFilters, status })}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      customFilters.status === status && styles.filterOptionTextActive,
                    ]}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Distance */}
          <View style={styles.filterSection}>
            <View style={styles.filterSectionHeader}>
              <Text style={styles.filterSectionTitle}>Distance</Text>
              <Text style={styles.filterValue}>{customFilters.distance}km</Text>
            </View>
            <View style={styles.distanceOptions}>
              {[5, 10, 20, 50].map((distance) => (
                <TouchableOpacity
                  key={distance}
                  style={[
                    styles.distanceOption,
                    customFilters.distance === distance && styles.distanceOptionActive,
                  ]}
                  onPress={() => setCustomFilters({ ...customFilters, distance })}
                >
                  <Text
                    style={[
                      styles.distanceOptionText,
                      customFilters.distance === distance && styles.distanceOptionTextActive,
                    ]}
                  >
                    {distance}km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Urgency */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Urgency Level</Text>
            <View style={styles.filterOptions}>
              {['all', 'low', 'medium', 'high', 'critical'].map((urgency) => (
                <TouchableOpacity
                  key={urgency}
                  style={[
                    styles.filterOption,
                    customFilters.urgency === urgency && styles.filterOptionActive,
                  ]}
                  onPress={() => setCustomFilters({ ...customFilters, urgency })}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      customFilters.urgency === urgency && styles.filterOptionTextActive,
                    ]}
                  >
                    {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Range */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Date Posted</Text>
            <View style={styles.filterOptions}>
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
              ].map((range) => (
                <TouchableOpacity
                  key={range.id}
                  style={[
                    styles.filterOption,
                    customFilters.dateRange === range.id && styles.filterOptionActive,
                  ]}
                  onPress={() => setCustomFilters({ ...customFilters, dateRange: range.id })}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      customFilters.dateRange === range.id && styles.filterOptionTextActive,
                    ]}
                  >
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Has Photo */}
          <View style={styles.filterSection}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <MaterialIcons name="photo-camera" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.switchLabel}>Only show cases with photos</Text>
              </View>
              <Switch
                value={customFilters.hasPhoto}
                onValueChange={(value) => setCustomFilters({ ...customFilters, hasPhoto: value })}
                trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                thumbColor={customFilters.hasPhoto ? theme.colors.primary : theme.colors.textTertiary}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.filterActions}>
            <GlassButton
              title="Reset"
              onPress={() => setCustomFilters({
                animalType: 'all',
                status: 'all',
                distance: 10,
                urgency: 'all',
                dateRange: 'all',
                hasPhoto: false,
              })}
              variant="light"
              style={styles.filterActionButton}
            />
            <GlassButton
              title="Apply Filters"
              onPress={() => setShowFilterModal(false)}
              variant="primary"
              style={styles.filterActionButton}
            />
          </View>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.sm,
  },
  filtersContainer: {
    marginBottom: theme.spacing.lg,
  },
  filtersContent: {
    gap: theme.spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: theme.colors.white,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  recentText: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
  },
  statsCard: {
    marginBottom: theme.spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.xs,
  },
  statValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.white,
  },
  filterSection: {
    marginBottom: theme.spacing.xl,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  filterSectionTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  filterValue: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  filterOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterOptionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterOptionText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  filterOptionTextActive: {
    color: theme.colors.white,
  },
  distanceOptions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  distanceOption: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  distanceOptionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  distanceOptionText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  distanceOptionTextActive: {
    color: theme.colors.white,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  switchLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  filterActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  filterActionButton: {
    flex: 1,
  },
});
