/**
 * Glass Card component with iOS-style glassmorphism effect
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function GlassCard({ 
  children, 
  style, 
  variant = 'default',
  intensity = 80,
  tint = 'light'
}) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: 'rgba(124, 111, 232, 0.15)' };
      case 'secondary':
        return { backgroundColor: 'rgba(255, 111, 0, 0.15)' };
      case 'accent':
        return { backgroundColor: 'rgba(255, 107, 107, 0.15)' };
      case 'light':
        return { backgroundColor: 'rgba(44, 44, 46, 0.8)' };
      case 'dark':
        return { backgroundColor: 'rgba(22, 22, 24, 0.9)' };
      default:
        return { backgroundColor: 'rgba(28, 28, 30, 0.8)' };
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View 
        style={[styles.glass, getVariantStyle()]}
      >
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  glass: {
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  content: {
    padding: theme.spacing.lg,
  },
});
