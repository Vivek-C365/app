/**
 * Reusable Card component
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function Card({ children, style, variant = 'default' }) {
  const getVariantStyle = () => {
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
  },
  default: {
    ...theme.shadow.md,
  },
  elevated: {
    ...theme.shadow.lg,
  },
  outlined: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
