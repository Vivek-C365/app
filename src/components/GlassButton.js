/**
 * Glass Button component with iOS-style glassmorphism effect
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { theme } from '../theme';

export default function GlassButton({ 
  title, 
  onPress, 
  variant = 'default',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  intensity = 80
}) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return { bg: theme.colors.primary, border: theme.colors.primary, text: theme.colors.white };
      case 'secondary':
        return { bg: theme.colors.secondary, border: theme.colors.secondary, text: theme.colors.white };
      case 'accent':
        return { bg: theme.colors.accent, border: theme.colors.accent, text: theme.colors.white };
      case 'success':
        return { bg: theme.colors.success, border: theme.colors.success, text: theme.colors.white };
      case 'light':
        return { bg: 'rgba(28, 28, 30, 0.8)', border: 'rgba(255, 255, 255, 0.1)', text: theme.colors.textPrimary };
      default:
        return { bg: 'rgba(28, 28, 30, 0.6)', border: 'rgba(255, 255, 255, 0.1)', text: theme.colors.textPrimary };
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.smallButton;
      case 'medium':
        return styles.mediumButton;
      case 'large':
        return styles.largeButton;
      default:
        return styles.mediumButton;
    }
  };

  const variantConfig = getVariantStyle();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[styles.container, disabled && styles.disabled, style]}
    >
      <View 
        style={[
          styles.glass, 
          getSizeStyle(),
          { 
            backgroundColor: variantConfig.bg,
            borderColor: variantConfig.border,
          }
        ]}
      >
        {loading ? (
          <ActivityIndicator color={variantConfig.text} />
        ) : (
          <View style={styles.content}>
            {icon && icon}
            <Text style={[styles.text, { color: variantConfig.text }, textStyle]}>
              {title}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    ...theme.shadow.sm,
  },
  glass: {
    borderWidth: 0,
    borderRadius: theme.borderRadius.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  
  // Sizes
  smallButton: {
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md,
  },
  mediumButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  largeButton: {
    paddingVertical: theme.spacing.md + 4,
    paddingHorizontal: theme.spacing.xl,
  },
  
  // Text
  text: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    letterSpacing: 0.3,
  },
  
  // States
  disabled: {
    opacity: 0.5,
  },
});
