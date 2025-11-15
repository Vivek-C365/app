/**
 * Modal component with Material Design styling
 */
import { View, Text, StyleSheet, Modal as RNModal, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function Modal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  size = 'medium',
  actions,
  fullScreen = false,
}) {
  const getModalSize = () => {
    if (fullScreen) {
      return { 
        width: '100%', 
        height: '100%', 
        maxWidth: '100%',
        maxHeight: '100%',
        borderRadius: 0,
      };
    }
    
    switch (size) {
      case 'small':
        return { maxHeight: '40%' };
      case 'medium':
        return { maxHeight: '60%' };
      case 'large':
        return { maxHeight: '80%' };
      case 'full':
        return { maxHeight: '90%' };
      default:
        return { maxHeight: '60%' };
    }
  };

  // For fullScreen mode, render without overlay and backdrop
  if (fullScreen) {
    return (
      <RNModal
        visible={visible}
        transparent={false}
        animationType="slide"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View style={styles.fullScreenContainer}>
          {children}
        </View>
      </RNModal>
    );
  }

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <View style={[styles.modalContainer, getModalSize()]}>
          {/* Header */}
          {(title || showCloseButton) && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {showCloseButton && (
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content */}
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {/* Actions */}
          {actions && (
            <View style={styles.actions}>
              {actions}
            </View>
          )}
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
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
    padding: theme.spacing.lg,
    maxHeight: '100%',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
