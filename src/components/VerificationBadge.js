/**
 * Verification Badge Component
 * Displays user verification status with icon and text
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function VerificationBadge({ 
  status = 'not_submitted', 
  size = 'medium',
  showText = true,
  style 
}) {
  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
        return {
          icon: 'verified',
          color: theme.colors.success,
          text: 'Verified',
          backgroundColor: theme.colors.success + '15',
        };
      case 'pending':
        return {
          icon: 'schedule',
          color: theme.colors.warning,
          text: 'Pending',
          backgroundColor: theme.colors.warning + '15',
        };
      case 'rejected':
        return {
          icon: 'cancel',
          color: theme.colors.error,
          text: 'Rejected',
          backgroundColor: theme.colors.error + '15',
        };
      default:
        return {
          icon: 'verified-user',
          color: theme.colors.textTertiary,
          text: 'Not Verified',
          backgroundColor: theme.colors.textTertiary + '15',
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          iconSize: 14,
          fontSize: theme.typography.fontSize.xs,
          padding: 4,
          gap: 4,
        };
      case 'large':
        return {
          iconSize: 24,
          fontSize: theme.typography.fontSize.md,
          padding: 10,
          gap: 8,
        };
      default: // medium
        return {
          iconSize: 18,
          fontSize: theme.typography.fontSize.sm,
          padding: 6,
          gap: 6,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const sizeConfig = getSizeConfig();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: statusConfig.backgroundColor,
          padding: sizeConfig.padding,
          gap: sizeConfig.gap,
        },
        style,
      ]}
    >
      <MaterialIcons
        name={statusConfig.icon}
        size={sizeConfig.iconSize}
        color={statusConfig.color}
      />
      {showText && (
        <Text
          style={[
            styles.text,
            {
              color: statusConfig.color,
              fontSize: sizeConfig.fontSize,
            },
          ]}
        >
          {statusConfig.text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.full,
  },
  text: {
    fontWeight: theme.typography.fontWeight.semibold,
  },
});