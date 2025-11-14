/**
 * Notifications Screen
 * Display user notifications
 */
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import GlassCard from '../components/GlassCard';

export default function NotificationsScreen() {
  const [selectedTab, setSelectedTab] = useState('all');
  const insets = useSafeAreaInsets();

  const tabs = [
    { id: 'all', label: 'All', count: 12 },
    { id: 'cases', label: 'Cases', count: 5 },
    { id: 'messages', label: 'Messages', count: 7 },
  ];

  const notifications = [
    {
      id: 1,
      type: 'case_assigned',
      title: 'New Case Assigned',
      message: 'You have been assigned to case AR-2024-001',
      time: '5 min ago',
      read: false,
      icon: 'assignment',
      iconColor: theme.colors.primary,
    },
    {
      id: 2,
      type: 'message',
      title: 'New Message',
      message: 'Rahul S. sent you a message about the rescue',
      time: '15 min ago',
      read: false,
      icon: 'chat',
      iconColor: theme.colors.accent,
    },
    {
      id: 3,
      type: 'case_update',
      title: 'Case Update',
      message: 'Case AR-2024-002 status changed to Resolved',
      time: '1 hour ago',
      read: true,
      icon: 'check-circle',
      iconColor: theme.colors.success,
    },
    {
      id: 4,
      type: 'nearby',
      title: 'Nearby Emergency',
      message: 'New urgent case reported 2km from your location',
      time: '2 hours ago',
      read: false,
      icon: 'warning',
      iconColor: theme.colors.warning,
    },
    {
      id: 5,
      type: 'reminder',
      title: 'Status Update Required',
      message: 'Please update status for case AR-2024-001',
      time: '3 hours ago',
      read: true,
      icon: 'notifications',
      iconColor: theme.colors.secondary,
    },
    {
      id: 6,
      type: 'achievement',
      title: 'Achievement Unlocked!',
      message: 'You helped 10 animals this month',
      time: '1 day ago',
      read: true,
      icon: 'star',
      iconColor: theme.colors.primary,
    },
  ];

  const markAllAsRead = () => {
    // Implementation
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 140,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <MaterialIcons name="done-all" size={20} color={theme.colors.primary} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                selectedTab === tab.id && styles.tabActive,
              ]}
              onPress={() => setSelectedTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab.id && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tab.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Notifications List */}
        <View style={styles.notificationsList}>
          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationItem,
                !notification.read && styles.notificationUnread,
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${notification.iconColor}20` }]}>
                <MaterialIcons
                  name={notification.icon}
                  size={24}
                  color={notification.iconColor}
                />
              </View>
              
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  {!notification.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <View style={styles.notificationFooter}>
                  <MaterialIcons name="access-time" size={14} color={theme.colors.textTertiary} />
                  <Text style={styles.notificationTime}>{notification.time}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Empty State (if no notifications) */}
        {notifications.length === 0 && (
          <GlassCard style={styles.emptyState}>
            <MaterialIcons name="notifications-none" size={64} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>
              You're all caught up! We'll notify you when something important happens.
            </Text>
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  markAllText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.white,
  },
  badge: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.white,
  },
  notificationsList: {
    gap: theme.spacing.sm,
  },
  notificationItem: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  notificationUnread: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  notificationTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  notificationMessage: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notificationTime: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl * 2,
    gap: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
