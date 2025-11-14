/**
 * Glass Button component with iOS-style glassmorphism effect
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, useWindowDimensions } from 'react-native';
import { theme } from '../theme';
import { getResponsiveFontSizes } from '../utils/responsive';

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
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const isMediumScreen = width >= 375 && width < 414;
  const fontSizes = getResponsiveFontSizes();

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return { bg: theme.colors.primary, text: theme.colors.white };
      case 'secondary':
        return { bg: theme.colors.secondary, text: theme.colors.white };
      case 'accent':
        return { bg: theme.colors.accent, text: theme.colors.white };
      case 'success':
        return { bg: theme.colors.success, text: theme.colors.white };
      case 'light':
        return { bg: 'rgba(60, 60, 60, 0.5)', text: theme.colors.textPrimary };
      default:
        return { bg: 'rgba(44, 44, 46, 0.8)', text: theme.colors.textPrimary };
    }
  };

  const getSizeStyle = () => {
    const baseStyles = {
      small: {
        paddingVertical: isSmallScreen ? 8 : 10,
        paddingHorizontal: isSmallScreen ? 12 : 16,
      },
      medium: {
        paddingVertical: isSmallScreen ? 12 : 14,
        paddingHorizontal: isSmallScreen ? 16 : 20,
      },
      large: {
        paddingVertical: isSmallScreen ? 14 : 18,
        paddingHorizontal: isSmallScreen ? 20 : 24,
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
          }
        ]}
      >
        {loading ? (
          <ActivityIndicator color={variantConfig.text} />
        ) : (
          <View style={styles.content}>
            {icon && icon}
            <Text style={[
              styles.text, 
              { 
                color: variantConfig.text,
                fontSize: getTextSize(),
              }, 
              textStyle
            ]}>
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
  
  // Text
  text: {
    fontWeight: theme.typography.fontWeight.semibold,
    letterSpacing: 0.3,
  },
  
  // States
  disabled: {
    opacity: 0.5,
  },
});
