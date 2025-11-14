/**
 * Reusable Button component
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { theme } from '../theme';
import { getResponsiveFontSizes } from '../utils/responsive';

export default function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
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

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryButton;
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      case 'ghost':
        return styles.ghostButton;
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'ghost':
        return styles.ghostText;
      default:
        return styles.primaryText;
    }
  };

  const getSizeStyle = () => {
    const baseStyles = {
      small: {
        paddingVertical: isSmallScreen ? 8 : theme.spacing.sm,
        paddingHorizontal: isSmallScreen ? 12 : theme.spacing.md,
      },
      medium: {
        paddingVertical: isSmallScreen ? 12 : theme.spacing.md,
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
      style={[
        styles.button,
        getVariantStyle(),
        getSizeStyle(),
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.colors.white : theme.colors.primary} />
      ) : (
        <>
          {icon && icon}
          <Text style={[styles.text, getTextStyle(), { fontSize: getTextSize() }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  
  // Variants - Rich colors
  primaryButton: {
    backgroundColor: theme.colors.primary,
    ...theme.shadow.lg,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
    ...theme.shadow.md,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  
  // Text styles
  text: {
    fontWeight: theme.typography.fontWeight.semibold,
  },
  primaryText: {
    color: theme.colors.textInverse,
  },
  secondaryText: {
    color: theme.colors.textInverse,
  },
  outlineText: {
    color: theme.colors.primary,
  },
  ghostText: {
    color: theme.colors.primary,
  },
  
  // States
  disabled: {
    opacity: 0.5,
  },
});
