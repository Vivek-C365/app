/**
 * Profile Screen
 * User profile and settings
 */
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Switch, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../config/supabase';
import toast from '../utils/toast';

export default function ProfileScreen({ navigation }) {
  const { user, profile, logout, biometricEnabled, biometricAvailable, enableBiometric, disableBiometric, updateProfile } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState({
    casesHelped: 0,
    activeCases: 0,
    rating: 0
  });
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (profile) {
      // Load notification preferences from profile
      const prefs = profile.notification_preferences || {};
      setNotificationsEnabled(prefs.push !== false);
      setWhatsappEnabled(prefs.whatsapp !== false);
      setEmailEnabled(prefs.email !== false);
      
      // Fetch user statistics
      fetchUserStats();
    }
  }, [profile]);

  const fetchUserStats = async () => {
    try {
      // TODO: Implement stats fetching from Supabase
      // For now, use placeholder data
      setUserStats({
        casesHelped: 0,
        activeCases: 0,
        rating: 0
      });
    } catch (error) {
      console.log('Error fetching user stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserStats();
    setRefreshing(false);
  };

  // Use profile data from context
  const userData = profile ? {
    name: profile.name || user?.user_metadata?.name || 'User',
    email: profile.email || user?.email || 'user@example.com',
    phone: profile.phone || user?.user_metadata?.phone || '+91 00000 00000',
    userType: profile.user_type || user?.user_metadata?.user_type || 'volunteer',
    verified: profile.verification?.status === 'approved',
    createdAt: profile.created_at || user?.created_at || new Date().toISOString(),
  } : {
    name: user?.user_metadata?.name || 'User',
    email: user?.email || 'user@example.com',
    phone: user?.user_metadata?.phone || '+91 00000 00000',
    userType: user?.user_metadata?.user_type || 'volunteer',
    verified: false,
    createdAt: user?.created_at || new Date().toISOString(),
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
    navigation.navigate('EditProfile');
  };

  const handleManageServiceAreas = () => {
    navigation.navigate('ServiceAreas');
  };

  const handleVerification = () => {
    navigation.navigate('Verification');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
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

  const updateNotificationPreference = async (key, value) => {
    try {
      const currentPrefs = profile?.notification_preferences || {};
      const updatedPrefs = {
        ...currentPrefs,
        [key]: value,
      };

      const result = await updateProfile({
        notification_preferences: updatedPrefs,
      });

      if (!result.success) {
        toast.error('Error', 'Failed to update notification preferences');
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast.error('Error', 'Failed to update notification preferences');
    }
  };

  const handleNotificationsToggle = async (value) => {
    setNotificationsEnabled(value);
    await updateNotificationPreference('push', value);
  };

  const handleWhatsAppToggle = async (value) => {
    setWhatsappEnabled(value);
    await updateNotificationPreference('whatsapp', value);
  };

  const handleEmailToggle = async (value) => {
    setEmailEnabled(value);
    await updateNotificationPreference('email', value);
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading profile..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingTop: 20,
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
            {userData.verified && (
              <Text style={styles.verifiedBadge}>✓ Verified</Text>
            )}
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
          <Text style={styles.infoValue}>{userData.email || 'Not provided'}</Text>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <MaterialIcons name="phone" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.infoLabel}>Phone</Text>
          </View>
          <Text style={styles.infoValue}>{userData.phone || 'Not provided'}</Text>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <MaterialIcons name="calendar-today" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.infoLabel}>Member Since</Text>
          </View>
          <Text style={styles.infoValue}>{formatJoinedDate(userData.createdAt)}</Text>
        </View>
      </GlassCard>

      {(userData.userType === 'volunteer' || userData.userType === 'ngo') && (
        <>
          <GlassCard variant="secondary" intensity={80} style={styles.section}>
            <Text style={styles.sectionTitle}>Verification Status</Text>
            <TouchableOpacity style={styles.verificationRow} onPress={handleVerification}>
              <View style={styles.verificationInfo}>
                <MaterialIcons
                  name={userData.verified ? 'verified' : 'verified-user'}
                  size={24}
                  color={userData.verified ? theme.colors.success : theme.colors.warning}
                />
                <View style={styles.verificationText}>
                  <Text style={styles.verificationLabel}>
                    {userData.verified ? 'Verified Account' : 'Verification Required'}
                  </Text>
                  <Text style={styles.verificationDescription}>
                    {userData.verified
                      ? 'Your account is verified'
                      : 'Complete verification to receive case notifications'}
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </GlassCard>

          <GlassCard variant="secondary" intensity={80} style={styles.section}>
            <Text style={styles.sectionTitle}>Service Areas</Text>
            <TouchableOpacity style={styles.menuRow} onPress={handleManageServiceAreas}>
              <View style={styles.menuInfo}>
                <MaterialIcons name="location-on" size={24} color={theme.colors.primary} />
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>Manage Service Areas</Text>
                  <Text style={styles.menuDescription}>
                    Define areas where you can help
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </GlassCard>
        </>
      )}

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
            onValueChange={handleNotificationsToggle}
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
            onValueChange={handleWhatsAppToggle}
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
            onValueChange={handleEmailToggle}
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
          title="Settings"
          onPress={handleSettings}
          variant="secondary"
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
    </SafeAreaView>
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
  verificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  verificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  verificationText: {
    flex: 1,
  },
  verificationLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing.xs,
  },
  verificationDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  menuInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing.xs,
  },
  menuDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});
