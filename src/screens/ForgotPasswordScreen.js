/**
 * @fileoverview Forgot Password Screen
 * Password reset flow
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
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GradientButton from '../components/GradientButton';
import GlassBackground from '../components/GlassBackground';
import { theme } from '../theme';
import apiService from '../../services/api';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) {
      return;
    }

    setLoading(true);
    try {
      // Call password reset API
      const response = await apiService.requestPasswordReset(email);
      
      if (response.success) {
        setEmailSent(true);
      } else {
        Alert.alert('Error', response.message || 'Failed to send reset email');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <GlassBackground>
        <View style={styles.container}>
          <View style={styles.successContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-open" size={80} color={theme.colors.success} />
            </View>
            <Text style={styles.successTitle}>Check Your Email</Text>
            <Text style={styles.successMessage}>
              We've sent password reset instructions to {email}
            </Text>
            <Text style={styles.successSubtext}>
              Please check your inbox and follow the link to reset your password.
            </Text>
            <GradientButton
              title="Back to Login"
              onPress={() => navigation.navigate('Login')}
              style={styles.backButton}
            />
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResetPassword}
            >
              <Text style={styles.resendText}>Didn't receive email? Resend</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GlassBackground>
    );
  }

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
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={60} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you instructions to reset your password
            </Text>
          </View>

          {/* Form */}
          <GlassCard style={styles.formCard}>
            <GlassInput
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail"
              error={error}
            />

            <GradientButton
              title="Send Reset Link"
              onPress={handleResetPassword}
              loading={loading}
              style={styles.submitButton}
            />
          </GlassCard>

          {/* Back to Login */}
          <View style={styles.footer}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Login')}
              style={styles.backToLoginButton}
            >
              <Ionicons name="arrow-back" size={16} color={theme.colors.primary} />
              <Text style={styles.backToLoginText}>Back to Login</Text>
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
    paddingTop: theme.spacing.xl * 2,
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
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  formCard: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  submitButton: {
    marginTop: theme.spacing.sm,
  },
  footer: {
    alignItems: 'center',
  },
  backToLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  backToLoginText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  successMessage: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  successSubtext: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  resendButton: {
    marginTop: theme.spacing.md,
  },
  resendText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
  },
});
