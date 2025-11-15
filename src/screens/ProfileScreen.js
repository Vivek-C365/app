/**
 * Profile Screen
 * User profile and settings
 */
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Switch, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../../services/api';
import toast from '../utils/toast';

export default function ProfileScreen() {
  const { user, logout, biometricEnabled, biometricAvailable, enableBiometric, disableBiometric } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [userStats, setUserStats] = useState({
    casesHelped: 0,
    activeCases: 0,
    rating: 0
  });
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProfile();
      
      if (response.success && response.data) {
        // The API returns { data: { user: {...} } }
        const userData = response.data.user || response.data;
        setProfileData(userData);
        
        // Fetch user statistics
        await fetchUserStats(userData._id || userData.id);
      }
    } catch (error) {
      console.log('Error fetching profile:', error);
      // If user is not authenticated, use the user from context
      if (user) {
        setProfileData(user);
        await fetchUserStats(user._id || user.id);
      } else {
        toast.warning('Not Logged In', 'Please log in to view your profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async (userId) => {
    try {
      // Fetch cases where user is assigned
      const casesResponse = await apiService.getCases({ 
        myOnly: true,
        limit: 100
      });
      
      if (casesResponse.success && casesResponse.data) {
        const allCases = casesResponse.data.cases || [];
        const activeCases = allCases.filter(c => 
          c.status === 'assigned' || c.status === 'in_progress'
        ).length;
        const resolvedCases = allCases.filter(c => 
          c.status === 'resolved' || c.status === 'closed'
        ).length;
        
        setUserStats({
          casesHelped: resolvedCases,
          activeCases: activeCases,
          rating: 4.8 // TODO: Implement rating system
        });
      }
    } catch (error) {
      console.log('Error fetching user stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProfileData();
    setRefreshing(false);
  };

  // Use actual user data or fallback
  const userData = profileData || user || {
    name: 'User',
    email: 'user@example.com',
    phone: '+91 00000 00000',
    userType: 'volunteer',
    verified: false,
    createdAt: new Date().toISOString(),
  };

  const formatJoinedDate = (dateString) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const capitalizeFirst = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing will be implemented in a future task');
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    await logout();
  };

  const handleBiometricToggle = async (value) => {
    if (value) {
      const success = await enableBiometric();
      if (!success) {
        Alert.alert('Error', 'Failed to enable biometric authentication');
      }
    } else {
      const success = await disableBiometric();
      if (!success) {
        Alert.alert('Error', 'Failed to disable biometric authentication');
      }
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading profile..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 140 
          }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {userData.name ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{userData.name || 'User'}</Text>
          <View style={styles.userTypeContainer}>
            <Text style={styles.userType}>{capitalizeFirst(userData.userType)}</Text>
            {userData.verified && <Text style={styles.verifiedBadge}>✓ Verified</Text>}
          </View>
        </View>

        <GlassCard variant="primary" intensity={85} style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialIcons name="pets" size={24} color={theme.colors.primary} />
            <Text style={styles.statValue}>{userStats.casesHelped}</Text>
            <Text style={styles.statLabel}>Cases Helped</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialIcons name="star" size={24} color={theme.colors.primary} />
            <Text style={styles.statValue}>{userStats.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialIcons name="assignment" size={24} color={theme.colors.primary} />
            <Text style={styles.statValue}>{userStats.activeCases}</Text>
            <Text style={styles.statLabel}>Active Cases</Text>
          </View>
        </View>
      </GlassCard>

      <GlassCard variant="light" intensity={80} style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <MaterialIcons name="email" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.infoLabel}>Email</Text>
          </View>
          <Text style={styles.infoValue}>{userData.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <MaterialIcons name="phone" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.infoLabel}>Phone</Text>
          </View>
          <Text style={styles.infoValue}>{userData.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <MaterialIcons name="calendar-today" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.infoLabel}>Member Since</Text>
          </View>
          <Text style={styles.infoValue}>{formatJoinedDate(userData.createdAt)}</Text>
        </View>
      </GlassCard>

      <GlassCard variant="secondary" intensity={80} style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        
        {biometricAvailable && (
          <View style={styles.settingRow}>
            <View style={styles.settingIconContainer}>
              <MaterialIcons name="fingerprint" size={20} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Biometric Authentication</Text>
              <Text style={styles.settingDescription}>
                Use fingerprint or face ID to login
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
              thumbColor={biometricEnabled ? theme.colors.primary : theme.colors.textTertiary}
            />
          </View>
        )}
      </GlassCard>

      <GlassCard variant="secondary" intensity={80} style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingIconContainer}>
            <MaterialIcons name="notifications" size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive alerts for nearby cases
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
            thumbColor={notificationsEnabled ? theme.colors.primary : theme.colors.textTertiary}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingIconContainer}>
            <MaterialIcons name="chat" size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>WhatsApp Notifications</Text>
            <Text style={styles.settingDescription}>
              Get updates via WhatsApp
            </Text>
          </View>
          <Switch
            value={whatsappEnabled}
            onValueChange={setWhatsappEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
            thumbColor={whatsappEnabled ? theme.colors.primary : theme.colors.textTertiary}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingIconContainer}>
            <MaterialIcons name="email" size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Email Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive case updates via email
            </Text>
          </View>
          <Switch
            value={emailEnabled}
            onValueChange={setEmailEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
            thumbColor={emailEnabled ? theme.colors.primary : theme.colors.textTertiary}
          />
        </View>
      </GlassCard>

      <View style={styles.actions}>
        <GlassButton
          title="Edit Profile"
          onPress={handleEditProfile}
          variant="primary"
          style={styles.actionButton}
          intensity={80}
        />
        <GlassButton
          title="Logout"
          onPress={handleLogout}
          variant="light"
          style={styles.actionButton}
          intensity={75}
        />
      </View>
      </ScrollView>

      <ConfirmDialog
        visible={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={confirmLogout}
        title="Logout"
        message="Are you sure you want to logout? You will need to sign in again to access your account."
        confirmText="Logout"
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
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.white,
  },
  userName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  userTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  userType: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  verifiedBadge: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.success,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  statsCard: {
    margin: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  section: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  settingIconContainer: {
    width: 32,
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing.xs,
  },
  settingDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  actions: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  actionButton: {
    width: '100%',
    marginBottom: 0,
  },
});
