/**
 * Glass Select/Dropdown component
 */
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import BottomSheet from './BottomSheet';

export default function GlassSelect({
  label,
  value,
  onValueChange,
  options = [],
  placeholder = 'Select an option',
  error,
  style,
  icon,
}) {
  const [showOptions, setShowOptions] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={[styles.selectButton, error && styles.selectError]}
        onPress={() => setShowOptions(true)}
      >
        <View style={styles.selectContent}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            style={[
              styles.selectText,
              !selectedOption && styles.placeholderText,
            ]}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
        </View>
        <MaterialIcons
          name="keyboard-arrow-down"
          size={24}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <BottomSheet
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        title={label || 'Select'}
        height="medium"
      >
        <View style={styles.optionsContainer}>
          <View style={styles.optionsWrapper}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  value === option.value && styles.optionSelected,
                ]}
                onPress={() => {
                  onValueChange(option.value);
                  setShowOptions(false);
                }}
              >
                {option.icon && (
                  <View style={styles.optionIcon}>{option.icon}</View>
                )}
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionLabel,
                      value === option.value && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {option.description && (
                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>
                  )}
                </View>
                {value === option.value && (
                  <MaterialIcons
                    name="check"
                    size={24}
                    color={theme.colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(28, 28, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  selectError: {
    borderColor: theme.colors.error,
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
  },
  selectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
  },
  selectText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.regular,
    flex: 1,
  },
  placeholderText: {
    color: theme.colors.textTertiary,
  },
  errorText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  optionsContainer: {
    paddingBottom: theme.spacing.xl,
  },
  optionsWrapper: {
    gap: theme.spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md + 2,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionSelected: {
    backgroundColor: 'rgba(124, 111, 232, 0.1)',
    borderColor: theme.colors.primary,
  },
  optionIcon: {
    width: 32,
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
    gap: 4,
  },
  optionLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  optionLabelSelected: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  optionDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
