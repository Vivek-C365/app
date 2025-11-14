/**
 * Glass UI Demo Screen
 * Showcases all glassmorphism components
 */
import React, { useState } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import {
  GlassBackground,
  GlassCard,
  GlassButton,
  GlassInput,
  StatusBadge,
  Card,
} from '../components';
import { theme } from '../theme';

export default function GlassUIDemo() {
  const [inputValue, setInputValue] = useState('');

  return (
    <GlassBackground variant="warm">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🪟 Glass UI Demo</Text>
          <Text style={styles.subtitle}>iOS-style Glassmorphism</Text>
        </View>

        {/* Glass Cards Section */}
        <Text style={styles.sectionTitle}>Glass Cards</Text>
        
        <GlassCard variant="default" intensity={80} style={styles.card}>
          <Text style={styles.cardTitle}>Default Glass Card</Text>
          <Text style={styles.cardText}>
            Frosted glass effect with subtle blur and transparency
          </Text>
        </GlassCard>

        <GlassCard variant="primary" intensity={85} style={styles.card}>
          <Text style={styles.cardTitle}>Primary Glass Card</Text>
          <Text style={styles.cardText}>
            Tinted with primary color for brand consistency
          </Text>
          <StatusBadge status="active" />
        </GlassCard>

        <GlassCard variant="secondary" intensity={80} style={styles.card}>
          <Text style={styles.cardTitle}>Secondary Glass Card</Text>
          <Text style={styles.cardText}>
            Warm orange tint for urgent or important content
          </Text>
          <StatusBadge status="assigned" />
        </GlassCard>

        <GlassCard variant="accent" intensity={80} style={styles.card}>
          <Text style={styles.cardTitle}>Accent Glass Card</Text>
          <Text style={styles.cardText}>
            Coral pink tint for caring and friendly content
          </Text>
          <StatusBadge status="resolved" />
        </GlassCard>

        {/* Glass Buttons Section */}
        <Text style={styles.sectionTitle}>Glass Buttons</Text>
        
        <View style={styles.buttonRow}>
          <GlassButton 
            title="Default" 
            variant="default"
            onPress={() => {}}
            style={styles.button}
          />
          <GlassButton 
            title="Primary" 
            variant="primary"
            onPress={() => {}}
            style={styles.button}
          />
        </View>

        <View style={styles.buttonRow}>
          <GlassButton 
            title="Secondary" 
            variant="secondary"
            onPress={() => {}}
            style={styles.button}
          />
          <GlassButton 
            title="Accent" 
            variant="accent"
            onPress={() => {}}
            style={styles.button}
          />
        </View>

        <GlassButton 
          title="Large Success Button" 
          variant="success"
          size="large"
          onPress={() => {}}
          style={styles.fullButton}
        />

        {/* Glass Inputs Section */}
        <Text style={styles.sectionTitle}>Glass Inputs</Text>
        
        <GlassCard variant="light" intensity={90} style={styles.card}>
          <GlassInput
            label="Animal Location"
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Enter location..."
            intensity={70}
          />

          <GlassInput
            label="Description"
            placeholder="Describe the situation..."
            multiline
            numberOfLines={4}
            intensity={70}
          />

          <GlassInput
            label="Contact Number"
            placeholder="+91 XXXXX XXXXX"
            keyboardType="phone-pad"
            intensity={70}
          />
        </GlassCard>

        {/* Mixed Glass & Regular Cards */}
        <Text style={styles.sectionTitle}>Mixed Styles</Text>
        
        <Card glass variant="primary" style={styles.card}>
          <Text style={styles.cardTitle}>Regular Card with Glass Mode</Text>
          <Text style={styles.cardText}>
            Existing Card component now supports glass prop
          </Text>
        </Card>

        <Card glass variant="secondary" style={styles.card}>
          <Text style={styles.cardTitle}>Glass Mode Secondary</Text>
          <Text style={styles.cardText}>
            Seamless integration with existing components
          </Text>
        </Card>

        {/* Intensity Comparison */}
        <Text style={styles.sectionTitle}>Blur Intensity</Text>
        
        <GlassCard variant="primary" intensity={50} style={styles.card}>
          <Text style={styles.cardTitle}>Low Intensity (50)</Text>
          <Text style={styles.cardText}>More transparent, subtle effect</Text>
        </GlassCard>

        <GlassCard variant="primary" intensity={80} style={styles.card}>
          <Text style={styles.cardTitle}>Medium Intensity (80)</Text>
          <Text style={styles.cardText}>Balanced blur and transparency</Text>
        </GlassCard>

        <GlassCard variant="primary" intensity={100} style={styles.card}>
          <Text style={styles.cardTitle}>High Intensity (100)</Text>
          <Text style={styles.cardText}>Maximum blur, more opaque</Text>
        </GlassCard>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🎨 iOS-inspired glassmorphism design
          </Text>
        </View>

      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    letterSpacing: 0.5,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  cardText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  button: {
    flex: 1,
  },
  fullButton: {
    marginBottom: theme.spacing.md,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  footerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
});
