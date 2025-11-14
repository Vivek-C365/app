/**
 * Glass Tab Bar component with iOS-style glassmorphism effect
 * Professional bottom navigation with consistent spacing and design
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Dimensions, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Responsive sizing based on screen width
const getResponsiveSizes = (screenWidth) => {
  const isSmallScreen = screenWidth < 375;
  const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
  
  return {
    TAB_BAR_HEIGHT: isSmallScreen ? 60 : 70,
    ICON_SIZE: isSmallScreen ? 46 : 52,
    PROFILE_RING_SIZE: isSmallScreen ? 56 : 62,
    ICON_SPACING: 8,
    HORIZONTAL_PADDING: isSmallScreen ? 12 : isMediumScreen ? 16 : 20,
  };
};

export default function GlassTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const sizes = getResponsiveSizes(width);
  
  return (
    <View style={[styles.container, { 
      paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 12),
      paddingHorizontal: sizes.HORIZONTAL_PADDING,
    }]}>
      <BlurView intensity={95} tint="dark" style={[styles.tabBar, { height: sizes.TAB_BAR_HEIGHT }]}>
        <View style={styles.tabsContainer}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const icon = options.tabBarIcon;
            const isFocused = state.index === index;
            const isProfile = route.name === 'Profile';

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                style={styles.tab}
                activeOpacity={0.6}
              >
                {isProfile ? (
                  // Profile tab with red ring (same size as others)
                  <View style={styles.profileContainer}>
                    {isFocused && <View style={[styles.profileRing, {
                      width: sizes.PROFILE_RING_SIZE,
                      height: sizes.PROFILE_RING_SIZE,
                      borderRadius: sizes.PROFILE_RING_SIZE / 2,
                    }]} />}
                    <View style={[
                      styles.iconCircle,
                      isFocused && styles.iconCircleActive,
                      {
                        width: sizes.ICON_SIZE,
                        height: sizes.ICON_SIZE,
                        borderRadius: sizes.ICON_SIZE / 2,
                      }
                    ]}>
                      {icon && icon({ 
                        size: Math.round(sizes.ICON_SIZE * 0.46), 
                        color: isFocused ? '#1A1A1A' : theme.colors.textSecondary
                      })}
                    </View>
                  </View>
                ) : (
                  // Regular icon tabs
                  <View style={[
                    styles.iconCircle,
                    isFocused && styles.iconCircleActive,
                    {
                      width: sizes.ICON_SIZE,
                      height: sizes.ICON_SIZE,
                      borderRadius: sizes.ICON_SIZE / 2,
                    }
                  ]}>
                    {icon && icon({ 
                      size: Math.round(sizes.ICON_SIZE * 0.46), 
                      color: isFocused ? '#1A1A1A' : theme.colors.textSecondary
                    })}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBar: {
    backgroundColor: 'rgba(18, 18, 18, 0.98)',
    borderRadius: 100,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    ...theme.shadow.xl,
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 12,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    minHeight: 60,
  },
  
  // Regular icon circles - responsive size
  iconCircle: {
    backgroundColor: 'rgba(60, 60, 60, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconCircleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{ scale: 1.08 }],
    ...theme.shadow.md,
  },
  
  // Profile with red ring - same size as other icons
  profileContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileRing: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#FF3B30',
    backgroundColor: 'transparent',
  },
});
