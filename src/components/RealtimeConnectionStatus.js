/**
 * @fileoverview Realtime Connection Status Component
 * Displays connection status and active subscriptions for debugging
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRealtime } from '../contexts/RealtimeContext';
import { colors } from '../theme/colors';

const RealtimeConnectionStatus = ({ showDetails = false }) => {
  const {
    isConnected,
    activeSubscriptions,
    subscriptionErrors,
    getActiveCount,
  } = useRealtime();

  const activeCount = getActiveCount();
  const errorCount = Object.keys(subscriptionErrors).length;

  if (!showDetails) {
    // Compact view - just a status indicator
    return (
      <View style={styles.compactContainer}>
        <View style={[
          styles.statusDot,
          { backgroundColor: isConnected ? colors.success : colors.error }
        ]} />
        <Text style={styles.compactText}>
          {isConnected ? 'Live' : 'Offline'}
        </Text>
        {activeCount > 0 && (
          <Text style={styles.countBadge}>{activeCount}</Text>
        )}
      </View>
    );
  }

  // Detailed view
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: isConnected ? colors.success : colors.error }
          ]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
        <Text style={styles.countText}>
          {activeCount} active subscription{activeCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {activeSubscriptions.length > 0 && (
        <View style={styles.subscriptionsList}>
          <Text style={styles.sectionTitle}>Active Subscriptions:</Text>
          {activeSubscriptions.map((sub, index) => (
            <View key={index} style={styles.subscriptionItem}>
              <View style={styles.subscriptionDot} />
              <Text style={styles.subscriptionText}>{sub}</Text>
            </View>
          ))}
        </View>
      )}

      {errorCount > 0 && (
        <View style={styles.errorsList}>
          <Text style={styles.errorTitle}>Errors ({errorCount}):</Text>
          {Object.entries(subscriptionErrors).map(([key, error], index) => (
            <View key={index} style={styles.errorItem}>
              <Text style={styles.errorKey}>{key}:</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Compact view styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  compactText: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.primary,
    borderRadius: 10,
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },

  // Detailed view styles
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  countText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  sectionTitle: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  subscriptionsList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  subscriptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  subscriptionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 8,
  },
  subscriptionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  errorsList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 0, 0, 0.2)',
  },
  errorTitle: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorItem: {
    marginBottom: 8,
  },
  errorKey: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  errorText: {
    color: colors.error,
    fontSize: 11,
  },
});

export default RealtimeConnectionStatus;
