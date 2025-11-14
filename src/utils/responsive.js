/**
 * Responsive utilities for adaptive layouts
 */
import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 11 Pro)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Scale size based on screen width
 */
export const scaleWidth = (size) => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Scale size based on screen height
 */
export const scaleHeight = (size) => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * Scale with moderate factor (better for fonts)
 */
export const moderateScale = (size, factor = 0.5) => {
  return size + (scaleWidth(size) - size) * factor;
};

/**
 * Normalize font size for different screen densities
 */
export const normalizeFont = (size) => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Check if device is small screen
 */
export const isSmallScreen = () => SCREEN_WIDTH < 375;

/**
 * Check if device is medium screen
 */
export const isMediumScreen = () => SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;

/**
 * Check if device is large screen
 */
export const isLargeScreen = () => SCREEN_WIDTH >= 414;

/**
 * Get responsive padding
 */
export const getResponsivePadding = () => {
  if (isSmallScreen()) return 12;
  if (isMediumScreen()) return 16;
  return 20;
};

/**
 * Get responsive margin
 */
export const getResponsiveMargin = () => {
  if (isSmallScreen()) return 12;
  if (isMediumScreen()) return 16;
  return 20;
};

/**
 * Get responsive font sizes
 */
export const getResponsiveFontSizes = () => {
  const scale = isSmallScreen() ? 0.9 : isMediumScreen() ? 0.95 : 1;
  
  return {
    xs: Math.round(11 * scale),
    sm: Math.round(13 * scale),
    md: Math.round(15 * scale),
    lg: Math.round(17 * scale),
    xl: Math.round(22 * scale),
    xxl: Math.round(26 * scale),
  };
};

export default {
  scaleWidth,
  scaleHeight,
  moderateScale,
  normalizeFont,
  isSmallScreen,
  isMediumScreen,
  isLargeScreen,
  getResponsivePadding,
  getResponsiveMargin,
  getResponsiveFontSizes,
};
