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
import ConfirmDialog from '../components/ConfirmDialog';
import BottomSheet from '../components/BottomSheet';
import GlassButton from '../components/GlassButton';

export default function CasesScreen() {
  const [loading] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
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
    setSelectedCase(caseId);
    setShowHelpDialog(true);
  };

  const confirmHelp = () => {
    Alert.alert('Success', 'You have been assigned to this case!');
  };

  const handleViewDetails = (caseId) => {
    setSelectedCase(caseId);
    setShowDetailsSheet(true);
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

      <ConfirmDialog
        visible={showHelpDialog}
        onClose={() => setShowHelpDialog(false)}
        onConfirm={confirmHelp}
        title="Respond to Case"
        message={`Do you want to help with case ${selectedCase}? You will be notified with the reporter's contact details.`}
        confirmText="Yes, I Can Help"
        cancelText="Cancel"
        type="success"
      />

      <BottomSheet
        visible={showDetailsSheet}
        onClose={() => setShowDetailsSheet(false)}
        title="Case Details"
        height="large"
      >
        <View style={styles.detailsContent}>
          <View style={styles.detailRow}>
            <MaterialIcons name="pets" size={20} color={theme.colors.primary} />
            <Text style={styles.detailLabel}>Case ID:</Text>
            <Text style={styles.detailValue}>{selectedCase}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="place" size={20} color={theme.colors.primary} />
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>Andheri West, Mumbai</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="person" size={20} color={theme.colors.primary} />
            <Text style={styles.detailLabel}>Reporter:</Text>
            <Text style={styles.detailValue}>Rahul S.</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Description</Text>
            <Text style={styles.detailDescription}>
              Dog found injured on the street. Appears to have a leg injury and needs immediate medical attention.
            </Text>
          </View>

          <GlassButton
            title="I Can Help"
            onPress={() => {
              setShowDetailsSheet(false);
              handleHelpCase(selectedCase);
            }}
            variant="accent"
            size="large"
          />
        </View>
      </BottomSheet>
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
  detailsContent: {
    gap: theme.spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  detailLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  detailValue: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  detailSection: {
    marginTop: theme.spacing.md,
  },
  detailSectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  detailDescription: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
});
