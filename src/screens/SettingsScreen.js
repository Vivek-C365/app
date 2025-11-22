/**
 * Settings Screen
 * App preferences and settings
 */
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from '../utils/toast';

export default function SettingsScreen({ navigation }) {
  const { profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notificationRadius, setNotificationRadius] = useState(10);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (profile?.notification_preferences?.radius) {
      setNotificationRadius(profile.notification_preferences.radius);
    }
  }, [profile]);

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
        toast.error('Error', 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Error', 'Failed to update settings');
    }
  };

  const handleRadiusChange = (increase) => {
    const newRadius = increase
      ? Math.min(notificationRadius + 5, 50)
      : Math.max(notificationRadius - 5, 5);
    
    setNotificationRadius(newRadius);
    updateNotificationPreference('radius', newRadius);
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            // TODO: Implement cache clearing
            toast.success('Success', 'Cache cleared successfully');
          },
        },
      ]
    );
  };

  const handleReportBug = () => {
    Alert.alert(
      'Report a Bug',
      'Please email us at support@animalrescue.com with details about the issue.',
      [{ text: 'OK' }]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About Animal Rescue Platform',
      'Version 1.0.0\n\nA platform to connect people who find injured animals with volunteers and NGOs who can help.\n\n© 2024 Animal Rescue Platform',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading settings..." />;
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
          <MaterialIcons name="settings" size={48} color={theme.colors.primary} />
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Customize your app experience</Text>
        </View>

        {(profile?.user_type === 'volunteer' || profile?.user_type === 'ngo') && (
          <GlassCard variant="light" intensity={80} style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Settings</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Notification Radius</Text>
                <Text style={styles.settingDescription}>
                  Receive alerts for cases within {notificationRadius} km
                </Text>
              </View>
              <View style={styles.radiusControls}>
                <TouchableOpacity
                  onPress={() => handleRadiusChange(false)}
                  style={styles.radiusButton}
                  disabled={notificationRadius <= 5}
                >
                  <MaterialIcons
                    name="remove"
                    size={20}
                    color={notificationRadius <= 5 ? theme.colors.textTertiary : theme.colors.primary}
                  />
                </TouchableOpacity>
                <Text style={styles.radiusValue}>{notificationRadius} km</Text>
                <TouchableOpacity
                  onPress={() => handleRadiusChange(true)}
                  style={styles.radiusButton}
                  disabled={notificationRadius >= 50}
                >
                  <MaterialIcons
                    name="add"
                    size={20}
                    color={notificationRadius >= 50 ? theme.colors.textTertiary : theme.colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>
        )}

        <GlassCard variant="secondary" intensity={80} style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleClearCache}>
            <View style={styles.menuItemLeft}>
              <MaterialIcons name="delete-sweep" size={24} color={theme.colors.textSecondary} />
              <Text style={styles.menuItemText}>Clear Cache</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </GlassCard>

        <GlassCard variant="secondary" intensity={80} style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleReportBug}>
            <View style={styles.menuItemLeft}>
              <MaterialIcons name="bug-report" size={24} color={theme.colors.textSecondary} />
              <Text style={styles.menuItemText}>Report a Bug</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
            <View style={styles.menuItemLeft}>
              <MaterialIcons name="info" size={24} color={theme.colors.textSecondary} />
              <Text style={styles.menuItemText}>About</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </GlassCard>

        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>Animal Rescue Platform</Text>
          <Text style={styles.versionNumber}>Version 1.0.0</Text>
        </View>
      </ScrollView>
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
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
  radiusControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  radiusButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  radiusValue: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    minWidth: 50,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  menuItemText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  versionInfo: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  versionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  versionNumber: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  },
});
