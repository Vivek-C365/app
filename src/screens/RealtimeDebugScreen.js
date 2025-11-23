/**
 * @fileoverview Realtime Debug Screen
 * Development screen to test and monitor Realtime subscriptions
 * This screen is for development/testing purposes only
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRealtime } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';
import RealtimeConnectionStatus from '../components/RealtimeConnectionStatus';
import { colors } from '../theme/colors';
import toast from '../utils/toast';

export default function RealtimeDebugScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    isConnected,
    activeSubscriptions,
    subscriptionErrors,
    subscribeToNewCases,
    subscribeToCaseUpdates,
    subscribeToStatusUpdates,
    subscribeToMessages,
    subscribeToPresence,
    subscribeToAssignments,
    unsubscribe,
    cleanupAllSubscriptions,
    getActiveCount,
    isSubscribed,
  } = useRealtime();

  const [subscriptions, setSubscriptions] = useState({
    newCases: false,
    caseUpdates: false,
    statusUpdates: false,
    messages: false,
    presence: false,
    assignments: false,
  });

  const [testCaseId] = useState('test-case-123');
  const [events, setEvents] = useState([]);

  const addEvent = (type, data) => {
    const event = {
      id: Date.now(),
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    setEvents(prev => [event, ...prev].slice(0, 50)); // Keep last 50 events
  };

  const handleToggleSubscription = async (type) => {
    try {
      if (subscriptions[type]) {
        // Unsubscribe
        let channelName;
        switch (type) {
          case 'newCases':
            channelName = 'new-cases';
            break;
          case 'caseUpdates':
            channelName = `case-updates:${testCaseId}`;
            break;
          case 'statusUpdates':
            channelName = `status-updates:${testCaseId}`;
            break;
          case 'messages':
            channelName = `messages:${testCaseId}`;
            break;
          case 'presence':
            channelName = `presence:${testCaseId}`;
            break;
          case 'assignments':
            channelName = `assignments:${user?.id}`;
            break;
        }
        
        await unsubscribe(channelName);
        setSubscriptions(prev => ({ ...prev, [type]: false }));
        addEvent('unsubscribe', { type, channelName });
        toast.success('Unsubscribed', `Unsubscribed from ${type}`);
      } else {
        // Subscribe
        switch (type) {
          case 'newCases':
            subscribeToNewCases((newCase) => {
              addEvent('new_case', newCase);
              toast.info('New Case', `Case ${newCase.id} created`);
            });
            break;

          case 'caseUpdates':
            subscribeToCaseUpdates(testCaseId, (updateData) => {
              addEvent('case_update', updateData);
              toast.info('Case Updated', `Changes: ${updateData.changes.join(', ')}`);
            });
            break;

          case 'statusUpdates':
            subscribeToStatusUpdates(testCaseId, (statusUpdate) => {
              addEvent('status_update', statusUpdate);
              toast.info('Status Update', `New update from ${statusUpdate.updated_by?.name}`);
            });
            break;

          case 'messages':
            subscribeToMessages(testCaseId, (message) => {
              addEvent('message', message);
              toast.info('New Message', message.content.substring(0, 50));
            });
            break;

          case 'presence':
            if (!user) {
              toast.error('Error', 'Must be logged in for presence');
              return;
            }
            await subscribeToPresence(
              testCaseId,
              { name: user.name, user_type: user.user_type },
              (presenceData) => {
                addEvent('presence', presenceData);
                if (presenceData.type === 'join') {
                  toast.info('User Joined', presenceData.user.name);
                } else if (presenceData.type === 'leave') {
                  toast.info('User Left', presenceData.user.name);
                }
              }
            );
            break;

          case 'assignments':
            if (!user) {
              toast.error('Error', 'Must be logged in for assignments');
              return;
            }
            subscribeToAssignments((assignment) => {
              addEvent('assignment', assignment);
              toast.info('New Assignment', `Case ${assignment.case_id}`);
            });
            break;
        }

        setSubscriptions(prev => ({ ...prev, [type]: true }));
        addEvent('subscribe', { type });
        toast.success('Subscribed', `Subscribed to ${type}`);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Error', error.message);
    }
  };

  const handleClearEvents = () => {
    setEvents([]);
    toast.success('Cleared', 'Event log cleared');
  };

  const handleCleanupAll = async () => {
    await cleanupAllSubscriptions();
    setSubscriptions({
      newCases: false,
      caseUpdates: false,
      statusUpdates: false,
      messages: false,
      presence: false,
      assignments: false,
    });
    addEvent('cleanup_all', {});
    toast.success('Cleanup Complete', 'All subscriptions removed');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Realtime Debug</Text>
        <TouchableOpacity onPress={handleCleanupAll} style={styles.cleanupButton}>
          <MaterialIcons name="clear-all" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <RealtimeConnectionStatus showDetails={true} />
        </View>

        {/* Test Case ID */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Case ID</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{testCaseId}</Text>
          </View>
        </View>

        {/* Subscription Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscriptions</Text>
          
          {Object.entries(subscriptions).map(([key, value]) => (
            <View key={key} style={styles.subscriptionRow}>
              <View style={styles.subscriptionInfo}>
                <Text style={styles.subscriptionName}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </Text>
                <Text style={styles.subscriptionStatus}>
                  {isSubscribed(getChannelName(key, testCaseId, user?.id)) ? '✓ Active' : '○ Inactive'}
                </Text>
              </View>
              <Switch
                value={value}
                onValueChange={() => handleToggleSubscription(key)}
                trackColor={{ false: colors.gray, true: colors.primary }}
                thumbColor={value ? colors.white : colors.lightGray}
              />
            </View>
          ))}
        </View>

        {/* Subscription Errors */}
        {Object.keys(subscriptionErrors).length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.error }]}>Errors</Text>
            {Object.entries(subscriptionErrors).map(([key, error]) => (
              <View key={key} style={styles.errorBox}>
                <Text style={styles.errorKey}>{key}</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Event Log */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Event Log ({events.length})</Text>
            <TouchableOpacity onPress={handleClearEvents}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          </View>

          {events.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-note" size={48} color={colors.gray} />
              <Text style={styles.emptyText}>No events yet</Text>
              <Text style={styles.emptySubtext}>
                Toggle subscriptions above to start receiving events
              </Text>
            </View>
          ) : (
            events.map((event) => (
              <View key={event.id} style={styles.eventItem}>
                <View style={styles.eventHeader}>
                  <View style={[styles.eventBadge, getEventBadgeStyle(event.type)]}>
                    <Text style={styles.eventType}>{event.type}</Text>
                  </View>
                  <Text style={styles.eventTime}>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.eventData} numberOfLines={3}>
                  {JSON.stringify(event.data, null, 2)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Helper function to get channel name
const getChannelName = (type, caseId, userId) => {
  switch (type) {
    case 'newCases':
      return 'new-cases';
    case 'caseUpdates':
      return `case-updates:${caseId}`;
    case 'statusUpdates':
      return `status-updates:${caseId}`;
    case 'messages':
      return `messages:${caseId}`;
    case 'presence':
      return `presence:${caseId}`;
    case 'assignments':
      return `assignments:${userId}`;
    default:
      return '';
  }
};

// Helper function to get event badge style
const getEventBadgeStyle = (type) => {
  const styles = {
    new_case: { backgroundColor: colors.success },
    case_update: { backgroundColor: colors.primary },
    status_update: { backgroundColor: colors.info },
    message: { backgroundColor: colors.warning },
    presence: { backgroundColor: colors.purple },
    assignment: { backgroundColor: colors.secondary },
    subscribe: { backgroundColor: colors.success },
    unsubscribe: { backgroundColor: colors.gray },
    cleanup_all: { backgroundColor: colors.error },
  };
  return styles[type] || { backgroundColor: colors.gray };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  cleanupButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  clearButton: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    color: colors.text,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    textTransform: 'capitalize',
  },
  subscriptionStatus: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorKey: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  eventItem: {
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  eventType: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
    textTransform: 'uppercase',
  },
  eventTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  eventData: {
    fontSize: 12,
    color: colors.text,
    fontFamily: 'monospace',
  },
});
