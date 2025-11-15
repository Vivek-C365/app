/**
 * Glass Input component with iOS-style glassmorphism effect
 */
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function GlassInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  secureTextEntry = false,
  editable = true,
  style,
  inputStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  autoCapitalize,
  autoComplete,
  intensity = 70,
}) {
  const renderIcon = (iconName, size = 22) => {
    if (!iconName) return null;
    if (typeof iconName === 'string') {
      return <Ionicons name={iconName} size={size} color="rgba(255, 255, 255, 0.6)" />;
    }
    return iconName;
  };
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        <BlurView 
          intensity={intensity} 
          tint="dark"
          style={[
            styles.glassContainer,
            error && styles.glassError,
          ]}
        >
          <View style={styles.inputContainer}>
            {leftIcon && <View style={styles.leftIcon}>{renderIcon(leftIcon)}</View>}
            <TextInput
              style={[
                styles.input,
                multiline && styles.multiline,
                !editable && styles.disabled,
                leftIcon && styles.inputWithLeftIcon,
                rightIcon && styles.inputWithRightIcon,
                inputStyle,
              ]}
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.textTertiary}
              multiline={multiline}
              numberOfLines={numberOfLines}
              keyboardType={keyboardType}
              secureTextEntry={secureTextEntry}
              editable={editable}
              autoCapitalize={autoCapitalize}
              autoComplete={autoComplete}
              textAlignVertical={multiline ? 'top' : 'center'}
            />
            {rightIcon && (
              onRightIconPress ? (
                <TouchableOpacity style={styles.rightIcon} onPress={onRightIconPress}>
                  {renderIcon(rightIcon)}
                </TouchableOpacity>
              ) : (
                <View style={styles.rightIcon}>{renderIcon(rightIcon)}</View>
              )
            )}
          </View>
        </BlurView>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  glassContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  glassError: {
    borderColor: theme.colors.error,
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  multiline: {
    minHeight: 100,
    paddingTop: theme.spacing.md,
    textAlignVertical: 'top',
  },
  inputWithLeftIcon: {
    paddingLeft: 44,
  },
  inputWithRightIcon: {
    paddingRight: 44,
  },
  leftIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
    opacity: 0.7,
  },
  rightIcon: {
    position: 'absolute',
    right: 16,
    zIndex: 1,
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.6,
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '600',
  },
});
