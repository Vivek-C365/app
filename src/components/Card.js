/**
 * Reusable Card component
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function Card({ children, style, variant = 'default', glass = false }) {
  const getVariantStyle = () => {
    if (glass) {
      switch (variant) {
        case 'primary':
          return styles.glassPrimary;
        case 'secondary':
          return styles.glassSecondary;
        case 'accent':
          return styles.glassAccent;
        default:
          return styles.glassDefault;
      }
    }
    
    switch (variant) {
      case 'elevated':
        return styles.elevated;
      case 'outlined':
        return styles.outlined;
      case 'default':
      default:
        return styles.default;
    }
  };

  return (
    <View style={[styles.card, getVariantStyle(), style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    overflow: 'hidden',
  },
  default: {
    ...theme.shadow.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  elevated: {
    ...theme.shadow.xl,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  outlined: {
    borderWidth: 2,
    borderColor: theme.colors.borderDark,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
  },
  
  // Glass variants
  glassDefault: {
    backgroundColor: theme.colors.glassBackground,
    borderWidth: 1.5,
    borderColor: theme.colors.glassBorder,
    ...theme.shadow.md,
  },
  glassPrimary: {
    backgroundColor: theme.colors.glassPrimary,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryLight,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    ...theme.shadow.lg,
  },
  glassSecondary: {
    backgroundColor: theme.colors.glassSecondary,
    borderWidth: 1.5,
    borderColor: theme.colors.secondaryLight,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
    ...theme.shadow.lg,
  },
  glassAccent: {
    backgroundColor: theme.colors.glassAccent,
    borderWidth: 1.5,
    borderColor: theme.colors.accentLight,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
    ...theme.shadow.lg,
  },
});
