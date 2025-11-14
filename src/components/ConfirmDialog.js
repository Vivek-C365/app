/**
 * Confirmation Dialog with Material Design styling
 */
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Modal from './Modal';
import GlassButton from './GlassButton';
import { theme } from '../theme';

export default function ConfirmDialog({
  visible,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'default', // default, danger, success, warning
  icon,
}) {
  const getIconConfig = () => {
    switch (type) {
      case 'danger':
        return { name: 'error', color: theme.colors.error };
      case 'success':
        return { name: 'check-circle', color: theme.colors.success };
      case 'warning':
        return { name: 'warning', color: theme.colors.warning };
      default:
        return { name: 'info', color: theme.colors.primary };
    }
  };

  const iconConfig = icon || getIconConfig();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      showCloseButton={false}
      size="small"
    >
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <MaterialIcons name={iconConfig.name} size={48} color={iconConfig.color} />
        </View>
        
        <Text style={styles.title}>{title}</Text>
        
        {message && (
          <Text style={styles.message}>{message}</Text>
        )}

        <View style={styles.actions}>
          <GlassButton
            title={cancelText}
            onPress={onClose}
            variant="light"
            style={styles.button}
          />
          <GlassButton
            title={confirmText}
            onPress={handleConfirm}
            variant={type === 'danger' ? 'accent' : 'primary'}
            style={styles.button}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  iconContainer: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  message: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
  },
});
