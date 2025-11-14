/**
 * Cases Screen
 * Displays active rescue cases
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, useWindowDimensions, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import AnimalCard from '../components/AnimalCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CasesScreen() {
  const [loading] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;
  
  // Mock data - will be replaced with API call
  const cases = [
    { 
      id: 'AR-2024-001',
      name: 'Archie',
      type: 'Dog', 
      status: 'Active', 
      location: 'Andheri West, Mumbai', 
      time: '2h ago',
      condition: 'Injured leg, needs immediate care',
      reporter: 'Rahul S.',
      imageUrl: null
    },
    { 
      id: 'AR-2024-002',
      name: 'Sunny',
      type: 'Bird', 
      status: 'Assigned', 
      location: 'Connaught Place, Delhi', 
      time: '5h ago',
      condition: 'Sitting on a twig, what a cutie isn\'t he?',
      reporter: 'Priya M.',
      imageUrl: null
    },
    { 
      id: 'AR-2024-003',
      name: 'Shadow',
      type: 'Cat', 
      status: 'Active', 
      location: 'Koramangala, Bangalore', 
      time: '1d ago',
      condition: 'Trapped in building, scared',
      reporter: 'Amit K.',
      imageUrl: null
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

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading cases..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.content,
          { 
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 140,
            paddingHorizontal: isSmallScreen ? theme.spacing.md : theme.spacing.lg,
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Animalbook</Text>
            <Text style={styles.subtitle}>Caring for 4 cats</Text>
          </View>
          <TouchableOpacity style={styles.addButton}>
            <MaterialIcons name="add" size={16} color={theme.colors.white} />
            <Text style={styles.addButtonText}>Add New</Text>
          </TouchableOpacity>
        </View>

        {cases.map((caseItem) => (
          <AnimalCard
            key={caseItem.id}
            id={caseItem.id}
            name={caseItem.name}
            type={caseItem.type}
            status={caseItem.status}
            location={caseItem.location}
            time={caseItem.time}
            condition={caseItem.condition}
            reporter={caseItem.reporter}
            imageUrl={caseItem.imageUrl}
            onPress={() => handleViewDetails(caseItem.id)}
            onHelp={() => handleHelpCase(caseItem.id)}
          />
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💚 Viewing cases within 10km radius
          </Text>
        </View>
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
    // Dynamic padding applied inline
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.regular,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  footer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  footerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
});
