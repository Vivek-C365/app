/**
 * Cases Screen
 * Displays active rescue cases
 */
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, useWindowDimensions, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { theme } from '../theme';
import AnimalCard from '../components/AnimalCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import BottomSheet from '../components/BottomSheet';
import GlassButton from '../components/GlassButton';
import GlassInput from '../components/GlassInput';
import apiService from '../../services/api';
import toast from '../utils/toast';
import { calculateDistance, formatDistance } from '../utils/locationUtils';
import { saveToCache, getFromCache } from '../utils/cacheUtils';
import { useAuth } from '../contexts/AuthContext';

export default function CasesScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'my', or 'reported'
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showNGOSheet, setShowNGOSheet] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [nearbyNGOs, setNearbyNGOs] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [transferReason, setTransferReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [caseTimeline, setCaseTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [filters, setFilters] = useState({
    animalType: 'all',
    urgencyLevel: 'all',
    sortBy: 'recent' // 'recent', 'distance', 'urgency'
  });
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  useEffect(() => {
    fetchCases();
    getUserLocation();
  }, [activeTab]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [cases, searchQuery, filters, userLocation]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      }
    } catch (error) {
      console.log('Error getting user location:', error);
    }
  };

  const fetchCases = async () => {
    try {
      setLoading(true);
      
      // Try to load from cache first
      const cacheKey = `cases_${activeTab}_${user?.id || 'guest'}`;
      const cachedData = await getFromCache(cacheKey);
      
      if (cachedData && !refreshing) {
        setCases(cachedData);
        setLoading(false);
      }
      
      // Fetch based on active tab
      let response;
      
      if (activeTab === 'my') {
        // Check if user is authenticated
        if (!isAuthenticated) {
          toast.warning('Login Required', 'Please login to view your cases');
          setCases([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }
        
        console.log('Fetching my cases for user:', user?.id || user?._id);
        
        // Fetch cases assigned to the current user
        // Use myOnly parameter to filter by authenticated user
        response = await apiService.getCases({ 
          status: 'assigned,in_progress', 
          limit: 50,
          myOnly: true 
        });
        
        console.log('My cases response:', response);
      } else if (activeTab === 'reported') {
        // Check if user is authenticated
        if (!isAuthenticated) {
          toast.warning('Login Required', 'Please login to view reported cases');
          setCases([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }
        
        console.log('Fetching reported cases for user:', user?.id || user?._id);
        
        // Fetch cases reported by the current user
        response = await apiService.getCases({ 
          reportedBy: user?.id || user?._id,
          limit: 50
        });
        
        console.log('Reported cases response:', response);
      } else {
        // Fetch open cases
        response = await apiService.getCases({ status: 'open', limit: 50 });
      }
      
      if (response.success && response.data) {
        // Transform API data to match component format
        const transformedCases = response.data.cases.map(caseItem => ({
          id: caseItem.caseId || caseItem._id,
          dbId: caseItem._id,
          name: getAnimalName(caseItem.animalType),
          type: capitalizeFirst(caseItem.animalType),
          status: capitalizeFirst(caseItem.status),
          location: caseItem.location.address || caseItem.location.landmarks || 'Unknown location',
          time: getTimeAgo(caseItem.createdAt),
          condition: caseItem.description,
          reporter: caseItem.contactInfo?.name || 'Anonymous',
          imageUrl: caseItem.photos && caseItem.photos.length > 0 ? caseItem.photos[0] : null,
          fullData: caseItem,
          coordinates: caseItem.location.coordinates,
          animalType: caseItem.animalType,
          urgencyLevel: caseItem.urgencyLevel,
          createdAt: caseItem.createdAt
        }));
        
        setCases(transformedCases);
        // Cache the data for offline viewing (30 minutes expiry)
        await saveToCache(cacheKey, transformedCases, 30);
      }
    } catch (error) {
      toast.error('Failed to load cases', 'Please check your connection and try again');
      
      // If network error, try to use cached data
      const cacheKey = `cases_${activeTab}_${user?.id || 'guest'}`;
      const cachedData = await getFromCache(cacheKey);
      if (cachedData) {
        setCases(cachedData);
        toast.info('Offline Mode', 'Showing cached cases');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFiltersAndSearch = () => {
    let filtered = [...cases];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(caseItem => 
        caseItem.type.toLowerCase().includes(query) ||
        caseItem.location.toLowerCase().includes(query) ||
        caseItem.condition.toLowerCase().includes(query) ||
        caseItem.id.toLowerCase().includes(query)
      );
    }

    // Apply animal type filter
    if (filters.animalType !== 'all') {
      filtered = filtered.filter(caseItem => 
        caseItem.animalType === filters.animalType
      );
    }

    // Apply urgency level filter
    if (filters.urgencyLevel !== 'all') {
      filtered = filtered.filter(caseItem => 
        caseItem.urgencyLevel === filters.urgencyLevel
      );
    }

    // Calculate distances if user location is available
    if (userLocation) {
      filtered = filtered.map(caseItem => {
        if (caseItem.coordinates && caseItem.coordinates.length === 2) {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            caseItem.coordinates[1], // latitude
            caseItem.coordinates[0]  // longitude
          );
          return {
            ...caseItem,
            distance,
            distanceText: formatDistance(distance)
          };
        }
        return caseItem;
      });
    }

    // Apply sorting
    if (filters.sortBy === 'distance' && userLocation) {
      filtered.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    } else if (filters.sortBy === 'urgency') {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      filtered.sort((a, b) => 
        (urgencyOrder[a.urgencyLevel] || 4) - (urgencyOrder[b.urgencyLevel] || 4)
      );
    } else {
      // Sort by recent (default)
      filtered.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
    }

    setFilteredCases(filtered);
  };

  const clearFilters = () => {
    setFilters({
      animalType: 'all',
      urgencyLevel: 'all',
      sortBy: 'recent'
    });
    setSearchQuery('');
  };

  const hasActiveFilters = () => {
    return filters.animalType !== 'all' || 
           filters.urgencyLevel !== 'all' || 
           filters.sortBy !== 'recent' ||
           searchQuery.trim() !== '';
  };

  const getTimelineIcon = (type) => {
    const icons = {
      created: 'add-circle',
      assigned: 'person-add',
      status_update: 'update',
      resolved: 'check-circle',
      transferred: 'transfer-within-a-station',
      ai_activated: 'smart-toy'
    };
    return icons[type] || 'circle';
  };

  const getTimelineIconStyle = (type) => {
    const colors = {
      created: theme.colors.primary,
      assigned: theme.colors.success,
      status_update: theme.colors.accent,
      resolved: theme.colors.success,
      transferred: theme.colors.warning,
      ai_activated: '#9C27B0' // Purple for AI
    };
    return { backgroundColor: colors[type] || theme.colors.textSecondary };
  };

  const formatTimelineDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCases();
  };

  const getAnimalName = (type) => {
    const names = {
      dog: 'Buddy',
      cat: 'Whiskers',
      bird: 'Tweety',
      cattle: 'Bessie',
      wildlife: 'Wild One',
      other: 'Friend'
    };
    return names[type] || 'Animal';
  };

  const capitalizeFirst = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ');
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handleHelpCase = (caseId) => {
    const caseData = cases.find(c => c.id === caseId);
    setSelectedCase(caseData);
    setShowHelpDialog(true);
  };

  const confirmHelp = async () => {
    setShowHelpDialog(false);
    
    try {
      const response = await apiService.assignCase(selectedCase.dbId, {
        helperName: 'Current User', // Will use actual user data when auth is implemented
        helperPhone: '+91 9876543210',
        helperType: 'volunteer'
      });

      if (response.success) {
        toast.success('Case Assigned!', 'You have been assigned to this case');
        // Refresh cases list
        fetchCases();
      }
    } catch (error) {
      toast.error('Assignment Failed', 'Could not assign case. Please try again.');
    }
  };

  const handleTransferCase = () => {
    setShowDetailsSheet(false);
    setShowTransferDialog(true);
  };

  const confirmTransfer = async () => {
    if (!transferReason.trim()) {
      toast.warning('Reason Required', 'Please provide a reason for transfer');
      return;
    }

    setShowTransferDialog(false);

    try {
      const response = await apiService.transferCase(selectedCase.dbId, {
        reason: transferReason,
      });

      if (response.success) {
        toast.success('Case Transferred', 'NGOs in your area will be notified');
        setTransferReason('');
        fetchCases();
      }
    } catch (error) {
      toast.error('Transfer Failed', 'Could not transfer case. Please try again.');
    }
  };

  const handleFindNGOs = async () => {
    setShowDetailsSheet(false);
    
    try {
      // Use case location or default coordinates
      const response = await apiService.getNearbyNGOs(19.0760, 72.8777, 10);
      
      if (response.success) {
        setNearbyNGOs(response.data.ngos);
        setShowNGOSheet(true);
      }
    } catch (error) {
      toast.error('Failed to Find NGOs', 'Could not load nearby NGOs');
    }
  };

  const handleViewDetails = async (caseId) => {
    const caseData = cases.find(c => c.id === caseId);
    
    // Navigate to details screen
    navigation.navigate('CaseDetails', { caseId: caseData.dbId });
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading cases..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.content,
          { 
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 140,
            paddingHorizontal: isSmallScreen ? theme.spacing.md : theme.spacing.lg,
          }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Animalbook</Text>
            <Text style={styles.subtitle}>
              {filteredCases.length} {filteredCases.length === 1 ? 'case' : 'cases'} {activeTab === 'my' ? 'assigned to you' : 'nearby'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('Report')}
          >
            <MaterialIcons name="add" size={16} color={theme.colors.white} />
            <Text style={styles.addButtonText}>Add New</Text>
          </TouchableOpacity>
        </View>

        {/* Search and Filter Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search cases..."
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
            style={[styles.filterButton, hasActiveFilters() && styles.filterButtonActive]}
            onPress={() => setShowFilterSheet(true)}
          >
            <MaterialIcons 
              name="filter-list" 
              size={20} 
              color={hasActiveFilters() ? theme.colors.white : theme.colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        {/* Active Filters Display */}
        {hasActiveFilters() && (
          <View style={styles.activeFilters}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {filters.animalType !== 'all' && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>{capitalizeFirst(filters.animalType)}</Text>
                  <TouchableOpacity onPress={() => setFilters({...filters, animalType: 'all'})}>
                    <MaterialIcons name="close" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              {filters.urgencyLevel !== 'all' && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>{capitalizeFirst(filters.urgencyLevel)} urgency</Text>
                  <TouchableOpacity onPress={() => setFilters({...filters, urgencyLevel: 'all'})}>
                    <MaterialIcons name="close" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              {filters.sortBy !== 'recent' && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>Sort: {capitalizeFirst(filters.sortBy)}</Text>
                  <TouchableOpacity onPress={() => setFilters({...filters, sortBy: 'recent'})}>
                    <MaterialIcons name="close" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}



        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
          >
            <MaterialIcons 
              name="explore" 
              size={20} 
              color={activeTab === 'all' ? theme.colors.primary : theme.colors.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              All Cases
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'my' && styles.tabActive]}
            onPress={() => setActiveTab('my')}
          >
            <MaterialIcons 
              name="favorite" 
              size={20} 
              color={activeTab === 'my' ? theme.colors.primary : theme.colors.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
              My Cases
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'reported' && styles.tabActive]}
            onPress={() => setActiveTab('reported')}
          >
            <MaterialIcons 
              name="assignment" 
              size={20} 
              color={activeTab === 'reported' ? theme.colors.primary : theme.colors.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === 'reported' && styles.tabTextActive]}>
              Reported
            </Text>
          </TouchableOpacity>
        </View>

        {filteredCases.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <MaterialIcons 
              name={hasActiveFilters() ? 'search-off' : (activeTab === 'my' ? 'favorite-border' : 'pets')} 
              size={64} 
              color={theme.colors.textSecondary} 
            />
            <Text style={styles.emptyTitle}>
              {hasActiveFilters() ? 'No Matching Cases' : (activeTab === 'my' ? 'No Assigned Cases' : 'No Cases Found')}
            </Text>
            <Text style={styles.emptyText}>
              {hasActiveFilters() 
                ? 'Try adjusting your search or filters to find more cases.'
                : (activeTab === 'my' 
                  ? "You haven't been assigned to any cases yet. Check 'All Cases' to help!"
                  : activeTab === 'reported'
                  ? "You haven't reported any cases yet. Tap 'Add New' to report an animal in need."
                  : 'There are no active rescue cases in your area right now.')}
            </Text>
            {hasActiveFilters() && (
              <TouchableOpacity style={styles.clearFiltersButtonLarge} onPress={clearFilters}>
                <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {filteredCases.map((caseItem, index) => {
          // Don't show "Find NGO" button if user is an NGO
          const isUserNGO = user?.userType === 'ngo';
          const shouldShowFindNGO = activeTab === 'my' && !isUserNGO;
          
          // For reported cases, don't show action buttons (just view details)
          const showHelpButton = activeTab === 'all';
          
          return (
            <AnimalCard
              key={`${caseItem.dbId}-${index}`}
              id={caseItem.id}
              name={caseItem.name}
              type={caseItem.type}
              status={caseItem.status}
              location={caseItem.distanceText ? `${caseItem.location} • ${caseItem.distanceText}` : caseItem.location}
              time={caseItem.time}
              condition={caseItem.condition}
              reporter={caseItem.reporter}
              imageUrl={caseItem.imageUrl}
              onPress={() => handleViewDetails(caseItem.id)}
              onHelp={showHelpButton ? () => handleHelpCase(caseItem.id) : undefined}
              onFindNGO={shouldShowFindNGO ? handleFindNGOs : undefined}
            />
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💚 Viewing cases within 10km radius
          </Text>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={showHelpDialog}
        onClose={() => setShowHelpDialog(false)}
        onConfirm={confirmHelp}
        title="Respond to Case"
        message={`Do you want to help with case ${selectedCase}? You will be notified with the reporter's contact details.`}
        confirmText="Yes, I Can Help"
        cancelText="Cancel"
        type="success"
      />

      <BottomSheet
        visible={showDetailsSheet}
        onClose={() => setShowDetailsSheet(false)}
        title="Case Details"
        height="large"
      >
        <View style={styles.detailsContent}>
          {selectedCase && (
            <>
              <View style={styles.detailRow}>
                <MaterialIcons name="pets" size={20} color={theme.colors.primary} />
                <Text style={styles.detailLabel}>Animal:</Text>
                <Text style={styles.detailValue}>{selectedCase.type}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <MaterialIcons name="place" size={20} color={theme.colors.primary} />
                <Text style={styles.detailLabel}>Location:</Text>
                <Text style={styles.detailValue}>{selectedCase.location}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <MaterialIcons name="person" size={20} color={theme.colors.primary} />
                <Text style={styles.detailLabel}>Reporter:</Text>
                <Text style={styles.detailValue}>{selectedCase.reporter}</Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons name="access-time" size={20} color={theme.colors.primary} />
                <Text style={styles.detailLabel}>Reported:</Text>
                <Text style={styles.detailValue}>{selectedCase.time}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Description</Text>
                <Text style={styles.detailDescription}>
                  {selectedCase.condition}
                </Text>
              </View>

              {/* Timeline Section */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Timeline</Text>
                {loadingTimeline ? (
                  <View style={styles.timelineLoading}>
                    <Text style={styles.timelineLoadingText}>Loading timeline...</Text>
                  </View>
                ) : caseTimeline.length > 0 ? (
                  <ScrollView style={styles.timeline} nestedScrollEnabled>
                    {caseTimeline.map((event, index) => (
                      <View key={index} style={styles.timelineItem}>
                        <View style={styles.timelineIconContainer}>
                          <View style={[styles.timelineIcon, getTimelineIconStyle(event.type)]}>
                            <MaterialIcons 
                              name={getTimelineIcon(event.type)} 
                              size={16} 
                              color={theme.colors.white} 
                            />
                          </View>
                          {index < caseTimeline.length - 1 && (
                            <View style={styles.timelineLine} />
                          )}
                        </View>
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineTitle}>{event.title || event.description}</Text>
                          <Text style={styles.timelineTime}>
                            {formatTimelineDate(event.timestamp)}
                          </Text>
                          
                          {/* Description */}
                          {event.description && (
                            <Text style={styles.timelineDescription}>{event.description}</Text>
                          )}

                          {/* Details Section */}
                          {event.details && (
                            <View style={styles.timelineDetails}>
                              {/* Reporter Info */}
                              {event.details.reporter && (
                                <View style={styles.timelineDetailRow}>
                                  <MaterialIcons name="person" size={14} color={theme.colors.textSecondary} />
                                  <Text style={styles.timelineDetailText}>
                                    Reporter: {event.details.reporter.name}
                                  </Text>
                                </View>
                              )}

                              {/* Helper Info */}
                              {event.details.helper && (
                                <>
                                  <View style={styles.timelineDetailRow}>
                                    <MaterialIcons name="person" size={14} color={theme.colors.textSecondary} />
                                    <Text style={styles.timelineDetailText}>
                                      {event.details.helper.name}
                                      {event.details.helper.organization && ` (${event.details.helper.organization})`}
                                    </Text>
                                  </View>
                                  <View style={styles.timelineDetailRow}>
                                    <MaterialIcons name="badge" size={14} color={theme.colors.textSecondary} />
                                    <Text style={styles.timelineDetailText}>
                                      {capitalizeFirst(event.details.helper.userType)}
                                    </Text>
                                  </View>
                                </>
                              )}

                              {/* Animal & Condition Info */}
                              {event.details.animalType && (
                                <View style={styles.timelineDetailRow}>
                                  <MaterialIcons name="pets" size={14} color={theme.colors.textSecondary} />
                                  <Text style={styles.timelineDetailText}>
                                    {capitalizeFirst(event.details.animalType)} - {capitalizeFirst(event.details.condition)}
                                  </Text>
                                </View>
                              )}

                              {/* Urgency Level */}
                              {event.details.urgencyLevel && (
                                <View style={styles.timelineDetailRow}>
                                  <MaterialIcons name="priority-high" size={14} color={theme.colors.textSecondary} />
                                  <Text style={styles.timelineDetailText}>
                                    Urgency: {capitalizeFirst(event.details.urgencyLevel)}
                                  </Text>
                                </View>
                              )}

                              {/* Location */}
                              {event.details.location && (
                                <View style={styles.timelineDetailRow}>
                                  <MaterialIcons name="place" size={14} color={theme.colors.textSecondary} />
                                  <Text style={styles.timelineDetailText} numberOfLines={2}>
                                    {event.details.location}
                                  </Text>
                                </View>
                              )}

                              {/* Status Change */}
                              {event.details.previousStatus && event.details.newStatus && (
                                <View style={styles.timelineDetailRow}>
                                  <MaterialIcons name="swap-horiz" size={14} color={theme.colors.textSecondary} />
                                  <Text style={styles.timelineDetailText}>
                                    {capitalizeFirst(event.details.previousStatus)} → {capitalizeFirst(event.details.newStatus)}
                                  </Text>
                                </View>
                              )}

                              {/* Condition Update */}
                              {event.details.condition && (
                                <View style={styles.timelineDetailRow}>
                                  <MaterialIcons name="healing" size={14} color={theme.colors.textSecondary} />
                                  <Text style={styles.timelineDetailText}>
                                    Condition: {capitalizeFirst(event.details.condition)}
                                  </Text>
                                </View>
                              )}

                              {/* Updated By */}
                              {event.details.updatedBy && (
                                <View style={styles.timelineDetailRow}>
                                  <MaterialIcons name="person-outline" size={14} color={theme.colors.textSecondary} />
                                  <Text style={styles.timelineDetailText}>
                                    By: {event.details.updatedBy.name}
                                    {event.details.updatedBy.organization && ` (${event.details.updatedBy.organization})`}
                                  </Text>
                                </View>
                              )}

                              {/* Duration */}
                              {event.details.duration && (
                                <View style={styles.timelineDetailRow}>
                                  <MaterialIcons name="timer" size={14} color={theme.colors.textSecondary} />
                                  <Text style={styles.timelineDetailText}>
                                    Duration: {event.details.duration}
                                  </Text>
                                </View>
                              )}

                              {/* Full Description */}
                              {event.details.description && (
                                <View style={styles.timelineDetailRow}>
                                  <Text style={styles.timelineDetailDescription}>
                                    {event.details.description}
                                  </Text>
                                </View>
                              )}

                              {/* Notes */}
                              {event.details.notes && (
                                <View style={styles.timelineDetailRow}>
                                  <Text style={styles.timelineDetailNotes}>
                                    Note: {event.details.notes}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}

                          {/* Photos */}
                          {event.photoCount > 0 && (
                            <View style={styles.timelinePhotosContainer}>
                              <MaterialIcons name="photo-library" size={16} color={theme.colors.primary} />
                              <Text style={styles.timelinePhotos}>
                                {event.photoCount} photo{event.photoCount > 1 ? 's' : ''} attached
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.timelineEmpty}>No timeline events yet</Text>
                )}
              </View>

              {/* Show different buttons based on case status */}
              {selectedCase.status === 'Open' ? (
                // For open cases - show "I Can Help"
                <>
                  <View style={styles.actionButtons}>
                    <GlassButton
                      title="I Can Help"
                      onPress={() => {
                        setShowDetailsSheet(false);
                        handleHelpCase(selectedCase.id);
                      }}
                      variant="accent"
                      size="large"
                      style={{ flex: 1 }}
                    />
                  </View>
                </>
              ) : (
                // For assigned cases - show only transfer option
                <>
                  <View style={styles.assignedBadge}>
                    <MaterialIcons name="check-circle" size={20} color={theme.colors.success} />
                    <Text style={styles.assignedText}>You are helping with this case</Text>
                  </View>

                  <View style={styles.actionButtons}>
                    <GlassButton
                      title="Transfer to NGO"
                      onPress={handleTransferCase}
                      variant="warning"
                      size="large"
                      icon={<MaterialIcons name="transfer-within-a-station" size={18} color={theme.colors.white} />}
                      style={{ flex: 1 }}
                    />
                  </View>
                </>
              )}
            </>
          )}
        </View>
      </BottomSheet>

      <ConfirmDialog
        visible={showTransferDialog}
        onClose={() => setShowTransferDialog(false)}
        onConfirm={confirmTransfer}
        title="Transfer Case to NGO"
        message="Please provide a reason for transferring this case to an NGO:"
        confirmText="Transfer"
        cancelText="Cancel"
        type="warning"
      >
        <GlassInput
          placeholder="e.g., Requires medical equipment, situation critical..."
          value={transferReason}
          onChangeText={setTransferReason}
          multiline
          numberOfLines={3}
        />
      </ConfirmDialog>

      <BottomSheet
        visible={showNGOSheet}
        onClose={() => setShowNGOSheet(false)}
        title="Nearby NGOs"
        height="large"
      >
        <ScrollView style={styles.ngoList}>
          {nearbyNGOs.map((ngo) => (
            <TouchableOpacity
              key={ngo.id}
              style={styles.ngoCard}
              onPress={() => {
                Alert.alert(
                  'Contact NGO',
                  `Call ${ngo.name}?\n\nPhone: ${ngo.phone}`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Call', onPress: () => toast.info('Calling...', ngo.phone) }
                  ]
                );
              }}
            >
              <View style={styles.ngoHeader}>
                <MaterialIcons name="business" size={24} color={theme.colors.primary} />
                <View style={styles.ngoInfo}>
                  <Text style={styles.ngoName}>{ngo.name}</Text>
                  <Text style={styles.ngoDistance}>{ngo.distance} km away</Text>
                </View>
              </View>
              <Text style={styles.ngoAddress}>{ngo.address}</Text>
              <Text style={styles.ngoPhone}>{ngo.phone}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="Filter & Sort Cases"
        height="large"
      >
        <View style={styles.filterContent}>
          {/* Animal Type Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Animal Type</Text>
            <View style={styles.filterOptions}>
              {['all', 'dog', 'cat', 'bird', 'cattle', 'wildlife', 'other'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterOption,
                    filters.animalType === type && styles.filterOptionActive
                  ]}
                  onPress={() => setFilters({...filters, animalType: type})}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.animalType === type && styles.filterOptionTextActive
                  ]}>
                    {capitalizeFirst(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Urgency Level Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Urgency Level</Text>
            <View style={styles.filterOptions}>
              {['all', 'critical', 'high', 'medium', 'low'].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.filterOption,
                    filters.urgencyLevel === level && styles.filterOptionActive
                  ]}
                  onPress={() => setFilters({...filters, urgencyLevel: level})}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.urgencyLevel === level && styles.filterOptionTextActive
                  ]}>
                    {capitalizeFirst(level)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sort By */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sort By</Text>
            <View style={styles.filterOptions}>
              {[
                { value: 'recent', label: 'Most Recent', icon: 'access-time' },
                { value: 'distance', label: 'Nearest', icon: 'near-me', disabled: !userLocation },
                { value: 'urgency', label: 'Most Urgent', icon: 'priority-high' }
              ].map((sort) => (
                <TouchableOpacity
                  key={sort.value}
                  style={[
                    styles.filterOption,
                    filters.sortBy === sort.value && styles.filterOptionActive,
                    sort.disabled && styles.filterOptionDisabled
                  ]}
                  onPress={() => !sort.disabled && setFilters({...filters, sortBy: sort.value})}
                  disabled={sort.disabled}
                >
                  <MaterialIcons 
                    name={sort.icon} 
                    size={16} 
                    color={filters.sortBy === sort.value ? theme.colors.white : theme.colors.textSecondary} 
                  />
                  <Text style={[
                    styles.filterOptionText,
                    filters.sortBy === sort.value && styles.filterOptionTextActive,
                    sort.disabled && styles.filterOptionTextDisabled
                  ]}>
                    {sort.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {!userLocation && (
              <Text style={styles.filterNote}>
                Enable location to sort by distance
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.filterActions}>
            <GlassButton
              title="Clear All"
              onPress={() => {
                clearFilters();
                setShowFilterSheet(false);
              }}
              variant="secondary"
              size="large"
              style={{ flex: 1 }}
            />
            <GlassButton
              title="Apply Filters"
              onPress={() => setShowFilterSheet(false)}
              variant="primary"
              size="large"
              style={{ flex: 1 }}
            />
          </View>
        </View>
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
    // Dynamic padding applied inline
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.regular,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    letterSpacing: 0.3,
  },
  tabs: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabActive: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  footer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  footerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 3,
    gap: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
    lineHeight: 22,
  },
  detailsContent: {
    gap: theme.spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  detailLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  detailValue: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  detailSection: {
    marginTop: theme.spacing.md,
  },
  detailSectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  detailDescription: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.success + '20',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.success,
    marginBottom: theme.spacing.md,
  },
  assignedText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.success,
    flex: 1,
  },
  actionButtons: {
    marginTop: theme.spacing.md,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  ngoList: {
    flex: 1,
  },
  ngoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ngoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  ngoInfo: {
    flex: 1,
  },
  ngoName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  ngoDistance: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  ngoAddress: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  ngoPhone: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
    marginTop: theme.spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.xs,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  activeFilters: {
    marginBottom: theme.spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  clearFiltersButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clearFiltersText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  clearFiltersButtonLarge: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
  },
  clearFiltersButtonText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  filterContent: {
    gap: theme.spacing.xl,
  },
  filterSection: {
    gap: theme.spacing.md,
  },
  filterSectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterOptionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterOptionDisabled: {
    opacity: 0.5,
  },
  filterOptionText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  filterOptionTextActive: {
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  filterOptionTextDisabled: {
    color: theme.colors.textTertiary,
  },
  filterNote: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  filterActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  fixCasesContainer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    marginVertical: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fixCasesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  fixCasesText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
  },
  fixCasesHint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  timeline: {
    marginTop: theme.spacing.md,
    maxHeight: 400,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timelineTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  timelineTime: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  timelineDescription: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  timelineDetails: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  timelineDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  timelineDetailText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  timelineDetailDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  timelineDetailNotes: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  timelinePhotosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  timelinePhotos: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  timelineLoading: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  timelineLoadingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  timelineEmpty: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: theme.spacing.lg,
  },
});
