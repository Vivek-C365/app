/**
 * Glass Background component with gradient and blur effect
 * iOS-style glassmorphism background
 */
import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

export default function GlassBackground({ 
  children, 
  variant = 'default',
  style 
}) {
  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return [theme.colors.background, theme.colors.primaryDark, theme.colors.background];
      case 'secondary':
        return [theme.colors.background, theme.colors.secondaryDark, theme.colors.background];
      case 'accent':
        return [theme.colors.background, theme.colors.accentDark, theme.colors.background];
      case 'warm':
        return [theme.colors.secondaryDark, theme.colors.accentDark, theme.colors.background];
      case 'cool':
        return [theme.colors.primaryDark, theme.colors.infoDark, theme.colors.background];
      default:
        return [theme.colors.backgroundDark, theme.colors.background, theme.colors.backgroundDark];
    }
  };

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Decorative blur circles */}
        <View style={[styles.blurCircle, styles.circle1]} />
        <View style={[styles.blurCircle, styles.circle2]} />
        <View style={[styles.blurCircle, styles.circle3]} />
        
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    position: 'relative',
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  circle1: {
    width: 300,
    height: 300,
    backgroundColor: theme.colors.primaryDark,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 250,
    height: 250,
    backgroundColor: theme.colors.accentDark,
    bottom: -80,
    left: -80,
  },
  circle3: {
    width: 200,
    height: 200,
    backgroundColor: theme.colors.secondaryDark,
    top: '40%',
    right: -50,
  },
});
