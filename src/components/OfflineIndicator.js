/**
 * @fileoverview Offline Indicator Component
 * Shows network status and sync information
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '../contexts/OfflineContext';
import { colors, spacing, typography } from '../theme';

const OfflineIndicator = ({ style, showDetails = false, compact = false }) => {
  const { isOnline, isSyncing, stats, sync, lastSyncTime } = useOffline();

  // Only show when offline or when there are pending items
  if (isOnline && stats.queuedMutations === 0 && !showDetails) {
    return null;
  }

  const handleSync = () => {
    if (!isSyncing && isOnline) {
      sync();
    }
  };

  const getLastSyncText = () => {
    if (!lastSyncTime) return 'Never synced';
    
    const minutes = Math.floor((Date.now() - lastSyncTime) / (60 * 1000));
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={[
          styles.statusDot,
          { backgroundColor: isOnline ? colors.success : colors.error }
        ]} />
        {!isOnline && (
          <Text style={styles.compactText}>Offline</Text>
        )}
        {stats.queuedMutations > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{stats.queuedMutations}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: isOnline ? colors.success : colors.error }
          ]} />
          <Text style={styles.statusText}>
            {isOnline ? (
              stats.queuedMutations > 0 ? `Syncing ${stats.queuedMutations} ${stats.queuedMutations === 1 ? 'item' : 'items'}` : 'Online'
            ) : (
              'Offline Mode'
            )}
          </Text>
        </View>

        {isOnline && stats.queuedMutations > 0 && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="sync" size={14} color={colors.primary} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {showDetails && (
        <View style={styles.details}>
          {stats.queuedMutations > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="cloud-upload-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                {stats.queuedMutations} pending {stats.queuedMutations === 1 ? 'change' : 'changes'}
              </Text>
            </View>
          )}

          {stats.savedDrafts > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="document-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                {stats.savedDrafts} saved {stats.savedDrafts === 1 ? 'draft' : 'drafts'}
              </Text>
            </View>
          )}

          {stats.cachedCases > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="folder-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                {stats.cachedCases} cached {stats.cachedCases === 1 ? 'case' : 'cases'}
              </Text>
            </View>
          )}

          {lastSyncTime && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                Last sync: {getLastSyncText()}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.textSecondary,
    fontSize: 11,
  },
  compactText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginRight: spacing.xs,
    fontSize: 11,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    marginLeft: spacing.xs,
  },
  details: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    fontSize: 11,
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: spacing.xs,
  },
  badgeText: {
    ...typography.caption,
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
  },
});

export default OfflineIndicator;
