/**
 * Status Badge component with rich colors
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function StatusBadge({ status, size = 'medium', style }) {
  const getStatusConfig = () => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'urgent':
        return {
          bg: theme.colors.statusActive,
          text: theme.colors.statusActiveText,
          label: 'Active',
        };
      case 'assigned':
      case 'in progress':
        return {
          bg: theme.colors.statusAssigned,
          text: theme.colors.statusAssignedText,
          label: 'Assigned',
        };
      case 'resolved':
      case 'completed':
        return {
          bg: theme.colors.statusResolved,
          text: theme.colors.statusResolvedText,
          label: 'Resolved',
        };
      case 'pending':
        return {
          bg: theme.colors.statusPending,
          text: theme.colors.statusPendingText,
          label: 'Pending',
        };
      default:
        return {
          bg: theme.colors.surfaceDark,
          text: theme.colors.textSecondary,
          label: status || 'Unknown',
        };
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.small;
      case 'medium':
        return styles.medium;
      case 'large':
        return styles.large;
      default:
        return styles.medium;
    }
  };

  const config = getStatusConfig();

  return (
    <View 
      style={[
        styles.badge, 
        getSizeStyle(),
        { backgroundColor: config.bg },
        style
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.text }]} />
      <Text style={[styles.text, { color: config.text }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: theme.borderRadius.round,
    gap: theme.spacing.xs,
  },
  
  // Sizes
  small: {
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
  },
  medium: {
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
  },
  large: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  text: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
