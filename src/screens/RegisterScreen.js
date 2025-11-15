/**
 * @fileoverview Registration Screen
 * User registration with role selection
 */
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GradientButton from '../components/GradientButton';
import GlassBackground from '../components/GlassBackground';
import { theme } from '../theme';

const USER_ROLES = [
  { label: 'Volunteer', value: 'volunteer', icon: 'heart', description: 'Help rescue animals' },
  { label: 'NGO', value: 'ngo', icon: 'business', description: 'Organization account' },
];

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    userType: 'volunteer',
    organization: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Invalid Indian phone number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.userType === 'ngo' && !formData.organization.trim()) {
      newErrors.organization = 'Organization name is required for NGOs';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        userType: formData.userType,
      };

      if (formData.userType === 'ngo') {
        userData.profile = {
          organization: formData.organization,
        };
      }

      const result = await register(userData);
      
      if (!result.success) {
        Alert.alert('Registration Failed', result.message || 'Unable to create account');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join our animal rescue community</Text>
          </View>

          {/* Role Selection */}
          <GlassCard style={styles.roleCard}>
            <Text style={styles.sectionTitle}>I want to</Text>
            <View style={styles.roleContainer}>
              {USER_ROLES.map((role) => (
                <TouchableOpacity
                  key={role.value}
                  style={[
                    styles.roleOption,
                    formData.userType === role.value && styles.roleOptionActive,
                  ]}
                  onPress={() => updateField('userType', role.value)}
                >
                  <Ionicons
                    name={role.icon}
                    size={28}
                    color={
                      formData.userType === role.value
                        ? theme.colors.primary
                        : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.roleLabel,
                      formData.userType === role.value && styles.roleLabelActive,
                    ]}
                  >
                    {role.label}
                  </Text>
                  <Text style={styles.roleDescription}>{role.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          {/* Registration Form */}
          <GlassCard style={styles.formCard}>
            <GlassInput
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              autoCapitalize="words"
              leftIcon="person"
              error={errors.name}
            />

            <GlassInput
              label="Email"
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(text) => updateField('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail"
              error={errors.email}
            />

            <GlassInput
              label="Phone Number"
              placeholder="+91 XXXXX XXXXX"
              value={formData.phone}
              onChangeText={(text) => updateField('phone', text)}
              keyboardType="phone-pad"
              autoComplete="tel"
              leftIcon="call"
              error={errors.phone}
            />

            {formData.userType === 'ngo' && (
              <GlassInput
                label="Organization Name"
                placeholder="Enter organization name"
                value={formData.organization}
                onChangeText={(text) => updateField('organization', text)}
                autoCapitalize="words"
                leftIcon="business"
                error={errors.organization}
              />
            )}

            <GlassInput
              label="Password"
              placeholder="Create a password"
              value={formData.password}
              onChangeText={(text) => updateField('password', text)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password-new"
              leftIcon="lock-closed"
              rightIcon={showPassword ? 'eye-off' : 'eye'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              error={errors.password}
            />

            <GlassInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChangeText={(text) => updateField('confirmPassword', text)}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              leftIcon="lock-closed"
              rightIcon={showConfirmPassword ? 'eye-off' : 'eye'}
              onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
              error={errors.confirmPassword}
            />

            <GradientButton
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              style={styles.registerButton}
            />
          </GlassCard>

          {/* Login Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl * 3,
  },
  headerContainer: {
    marginBottom: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  roleCard: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  roleOption: {
    flex: 1,
    padding: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  roleOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  roleLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  roleLabelActive: {
    color: theme.colors.primary,
  },
  roleDescription: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  formCard: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  registerButton: {
    marginTop: theme.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  footerText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.md,
  },
  loginLink: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
