/**
 * Glass Input component with iOS-style glassmorphism effect
 */
import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '../theme';

export default function GlassInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  secureTextEntry = false,
  editable = true,
  style,
  inputStyle,
  leftIcon,
  rightIcon,
  intensity = 70,
}) {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        <BlurView 
          intensity={intensity} 
          tint="dark"
          style={[
            styles.glassContainer,
            error && styles.glassError,
          ]}
        >
          <View style={styles.inputContainer}>
            {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
            <TextInput
              style={[
                styles.input,
                multiline && styles.multiline,
                !editable && styles.disabled,
                leftIcon && styles.inputWithLeftIcon,
                rightIcon && styles.inputWithRightIcon,
                inputStyle,
              ]}
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.textTertiary}
              multiline={multiline}
              numberOfLines={numberOfLines}
              keyboardType={keyboardType}
              secureTextEntry={secureTextEntry}
              editable={editable}
              textAlignVertical={multiline ? 'top' : 'center'}
            />
            {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
          </View>
        </BlurView>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  glassContainer: {
    backgroundColor: 'rgba(28, 28, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: theme.borderRadius.md,
  },
  glassError: {
    borderColor: theme.colors.error,
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.regular,
  },
  multiline: {
    minHeight: 100,
    paddingTop: theme.spacing.md,
    textAlignVertical: 'top',
  },
  inputWithLeftIcon: {
    paddingLeft: 44,
  },
  inputWithRightIcon: {
    paddingRight: 44,
  },
  leftIcon: {
    position: 'absolute',
    left: theme.spacing.md,
    zIndex: 1,
  },
  rightIcon: {
    position: 'absolute',
    right: theme.spacing.md,
    zIndex: 1,
  },
  disabled: {
    opacity: 0.6,
  },
  errorText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
