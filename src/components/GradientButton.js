/**
 * Gradient Button component with rich colors
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

export default function GradientButton({ 
  title, 
  onPress, 
  gradient = 'primary',
  size = 'medium',
  disabled = false,
  loading = false, 
  icon,
  style,
  textStyle 
}) {
  const getGradientColors = () => {
    switch (gradient) {
      case 'primary':
        return theme.gradients.primary.colors;
      case 'secondary':
        return theme.gradients.secondary.colors;
      case 'accent':
        return theme.gradients.accent.colors;
      case 'warm':
        return theme.gradients.warm.colors;
      case 'cool':
        return theme.gradients.cool.colors;
      case 'success':
        return theme.gradients.success.colors;
      default:
        return theme.gradients.primary.colors;
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

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[styles.container, disabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, getSizeStyle()]}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.textInverse} />
        ) : (
          <>
            {icon && icon}
            <Text style={[styles.text, textStyle]}>
              {title}
            </Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadow.lg,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  
  // Sizes
  smallButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  mediumButton: {
    paddingVertical: theme.spacing.md + 2,
    paddingHorizontal: theme.spacing.lg,
  },
  largeButton: {
    paddingVertical: 18,
    paddingHorizontal: theme.spacing.xl,
  },
  
  // Text
  text: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textInverse,
    letterSpacing: 0.5,
  },
  
  // States
  disabled: {
    opacity: 0.5,
  },
});
