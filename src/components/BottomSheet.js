/**
 * Bottom Sheet component with Material Design styling
 */
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { useEffect, useRef } from 'react';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function BottomSheet({
  visible,
  onClose,
  title,
  children,
  height = 'auto',
  showHandle = true,
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const getHeight = () => {
    switch (height) {
      case 'small':
        return SCREEN_HEIGHT * 0.3;
      case 'medium':
        return SCREEN_HEIGHT * 0.5;
      case 'large':
        return SCREEN_HEIGHT * 0.75;
      case 'full':
        return SCREEN_HEIGHT * 0.95;
      default:
        return 'auto';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <Animated.View 
          style={[
            styles.sheetContainer,
            {
              height: getHeight(),
              paddingBottom: insets.bottom,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {showHandle && (
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
          )}

          {title && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl + 8,
    borderTopRightRadius: theme.borderRadius.xl + 8,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  closeButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.md,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
});
