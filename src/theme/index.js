/**
 * Main theme export
 */
import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

export const theme = {
  colors,
  spacing,
  typography,
  
  // Border radius
  borderRadius: {
    sm: 8,
    md: 10,
    lg: 12,
    xl: 14,
    round: 999,
  },
  
  // Shadows - Enhanced depth
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 12,
    },
  },
  
  // Gradients
  gradients: {
    primary: {
      colors: [colors.primary, colors.primaryLight],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    secondary: {
      colors: [colors.secondary, colors.secondaryLight],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    accent: {
      colors: [colors.accent, colors.accentLight],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    warm: {
      colors: [colors.secondary, colors.accent],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
    },
    cool: {
      colors: [colors.primary, colors.info],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
    },
    success: {
      colors: [colors.success, colors.successLight],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
  },
  
  // Glass Effect Styles
  glass: {
    default: {
      backgroundColor: colors.glassBackground,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backdropFilter: 'blur(20px)',
    },
    light: {
      backgroundColor: colors.glassLight,
      borderWidth: 1,
      borderColor: colors.glassHighlight,
      backdropFilter: 'blur(30px)',
    },
    dark: {
      backgroundColor: colors.glassDark,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backdropFilter: 'blur(15px)',
    },
    primary: {
      backgroundColor: colors.glassPrimary,
      borderWidth: 1,
      borderColor: colors.primaryLight,
      backdropFilter: 'blur(20px)',
    },
    secondary: {
      backgroundColor: colors.glassSecondary,
      borderWidth: 1,
      borderColor: colors.secondaryLight,
      backdropFilter: 'blur(20px)',
    },
    accent: {
      backgroundColor: colors.glassAccent,
      borderWidth: 1,
      borderColor: colors.accentLight,
      backdropFilter: 'blur(20px)',
    },
  },
};

export { colors, spacing, typography };
