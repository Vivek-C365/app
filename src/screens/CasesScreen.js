/**
 * Cases Screen
 * Displays active rescue cases
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { theme } from '../theme';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CasesScreen() {
  const [loading] = useState(false);
  
  // Mock data - will be replaced with API call
  const cases = [
    { 
      id: 'AR-2024-001', 
      type: 'Dog', 
      status: 'Active', 
      location: 'Andheri West, Mumbai', 
      time: '2h ago',
      condition: 'Injured',
      reporter: 'Rahul S.'
    },
    { 
      id: 'AR-2024-002', 
      type: 'Cat', 
      status: 'Volunteer Assigned', 
      location: 'Connaught Place, Delhi', 
      time: '5h ago',
      condition: 'Sick',
      reporter: 'Priya M.'
    },
    { 
      id: 'AR-2024-003', 
      type: 'Bird', 
      status: 'Active', 
      location: 'Koramangala, Bangalore', 
      time: '1d ago',
      condition: 'Trapped',
      reporter: 'Amit K.'
    },
  ];

  const handleHelpCase = (caseId) => {
    Alert.alert(
      'Respond to Case',
      `Do you want to help with case ${caseId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, I can help', 
          onPress: () => Alert.alert('Success', 'You have been assigned to this case!')
        }
      ]
    );
  };

  const handleViewDetails = (caseId) => {
    Alert.alert('Case Details', `Viewing details for ${caseId}`);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Active':
        return styles.statusActive;
      case 'Volunteer Assigned':
        return styles.statusAssigned;
      case 'Resolved':
        return styles.statusResolved;
      default:
        return styles.statusActive;
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading cases..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Active Rescue Cases</Text>
        <Text style={styles.subtitle}>Cases near you that need help</Text>
      </View>

      {cases.map((caseItem) => (
        <Card key={caseItem.id} style={styles.caseCard}>
          <View style={styles.caseHeader}>
            <View>
              <Text style={styles.caseId}>{caseItem.id}</Text>
              <Text style={styles.caseType}>
                {caseItem.type} - {caseItem.condition}
              </Text>
            </View>
            <View style={[styles.statusBadge, getStatusStyle(caseItem.status)]}>
              <Text style={styles.statusText}>{caseItem.status}</Text>
            </View>
          </View>

          <Text style={styles.caseLocation}>📍 {caseItem.location}</Text>
          <Text style={styles.caseReporter}>👤 Reported by: {caseItem.reporter}</Text>
          <Text style={styles.caseTime}>⏰ {caseItem.time}</Text>

          <View style={styles.caseActions}>
            <Button
              title="🆘 I Can Help"
              onPress={() => handleHelpCase(caseItem.id)}
              style={styles.helpButton}
            />
            <Button
              title="View Details"
              onPress={() => handleViewDetails(caseItem.id)}
              variant="secondary"
              style={styles.viewButton}
            />
          </View>
        </Card>
      ))}

      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>
          💚 You're viewing cases within 10km radius
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  caseCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  caseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  caseId: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xs,
  },
  caseType: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 1,
    borderRadius: theme.borderRadius.xl,
  },
  statusActive: {
    backgroundColor: theme.colors.statusActive,
  },
  statusAssigned: {
    backgroundColor: theme.colors.statusAssigned,
  },
  statusResolved: {
    backgroundColor: theme.colors.statusResolved,
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  caseLocation: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  caseReporter: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xs,
  },
  caseTime: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.md,
  },
  caseActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  helpButton: {
    flex: 2,
  },
  viewButton: {
    flex: 1,
  },
  emptyState: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
});
