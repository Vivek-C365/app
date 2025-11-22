/**
 * Edit Profile Screen
 * Allows users to edit their profile information
 */
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from '../utils/toast';

export default function EditProfileScreen({ navigation }) {
  const { user, profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    organization: '',
  });
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        organization: profile.organization || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    // Validate inputs
    if (!formData.name.trim()) {
      toast.error('Validation Error', 'Name is required');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('Validation Error', 'Phone number is required');
      return;
    }

    // Validate phone number format (Indian phone numbers)
    const phoneRegex = /^[+]?[0-9]{10,13}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      toast.error('Validation Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);

    try {
      const result = await updateProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        organization: formData.organization.trim() || null,
      });

      if (result.success) {
        toast.success('Success', 'Profile updated successfully');
        navigation.goBack();
      } else {
        toast.error('Error', result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Updating profile..." />;
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
          <MaterialIcons name="edit" size={48} color={theme.colors.primary} />
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Update your personal information</Text>
        </View>

        <GlassCard variant="light" intensity={80} style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="person"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter your full name"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="phone"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="+91 00000 00000"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {profile?.user_type === 'ngo' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Organization Name</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="business"
                  size={20}
                  color={theme.colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.organization}
                  onChangeText={(text) => setFormData({ ...formData, organization: text })}
                  placeholder="Enter organization name"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={16} color={theme.colors.info} />
            <Text style={styles.infoText}>
              Email cannot be changed. Contact support if you need to update your email address.
            </Text>
          </View>
        </GlassCard>

        <View style={styles.actions}>
          <GlassButton
            title="Save Changes"
            onPress={handleSave}
            variant="primary"
            style={styles.actionButton}
            intensity={85}
          />
          <GlassButton
            title="Cancel"
            onPress={handleCancel}
            variant="light"
            style={styles.actionButton}
            intensity={75}
          />
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
  formCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.infoBackground,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.info,
    lineHeight: 20,
  },
  actions: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  actionButton: {
    width: '100%',
    marginBottom: 0,
  },
});
