/**
 * Gradient Button component with rich colors
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import { getResponsiveFontSizes } from '../utils/responsive';

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
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const fontSizes = getResponsiveFontSizes();

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
    const baseStyles = {
      small: {
        paddingVertical: isSmallScreen ? 8 : theme.spacing.sm,
        paddingHorizontal: isSmallScreen ? 12 : theme.spacing.md,
      },
      medium: {
        paddingVertical: isSmallScreen ? 12 : theme.spacing.md + 2,
        paddingHorizontal: isSmallScreen ? 16 : theme.spacing.lg,
      },
      large: {
        paddingVertical: isSmallScreen ? 14 : 18,
        paddingHorizontal: isSmallScreen ? 20 : theme.spacing.xl,
      },
    };
    return baseStyles[size] || baseStyles.medium;
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return fontSizes.sm;
      case 'medium':
        return fontSizes.md;
      case 'large':
        return fontSizes.lg;
      default:
        return fontSizes.md;
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
            <Text style={[styles.text, { fontSize: getTextSize() }, textStyle]}>
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
  
  // Text
  text: {
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textInverse,
    letterSpacing: 0.5,
  },
  
  // States
  disabled: {
    opacity: 0.5,
  },
});
