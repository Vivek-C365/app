/**
 * Animal Card component
 * Card with prominent image display for cases
 */
import { View, Text, Image, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import StatusBadge from './StatusBadge';

const getCardHeight = (screenWidth) => {
  if (screenWidth < 375) return 350;
  if (screenWidth < 414) return 380;
  return 400;
};

export default function AnimalCard({ 
  id,
  type,
  name,
  status,
  location,
  time,
  condition,
  reporter,
  imageUrl,
  onPress,
  onHelp,
  onFindNGO,
  style
}) {
  const { width } = useWindowDimensions();
  const cardHeight = getCardHeight(width);
  
  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Image Section */}
        <View style={[styles.imageContainer, { height: cardHeight }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholderImage]}>
              <Text style={styles.placeholderEmoji}>
                {type === 'Dog' ? '🐕' : type === 'Cat' ? '🐈' : type === 'Bird' ? '🦜' : '🐾'}
              </Text>
            </View>
          )}
          
          {/* Overlay Info */}
          <View style={styles.overlay}>
            <View style={styles.overlayBlur}>
              <View style={styles.overlayContent}>
                <View style={styles.topRow}>
                  <View>
                    <Text style={styles.caseId}>{id}</Text>
                    <Text style={styles.animalName}>{name || type}</Text>
                  </View>
                  <StatusBadge status={status} size="small" />
                </View>
                
                <Text style={styles.condition}>{condition}</Text>
                <View style={styles.infoRow}>
                  <MaterialIcons name="place" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.location} numberOfLines={1}>{location}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons name="access-time" size={14} color={theme.colors.textTertiary} />
                  <Text style={styles.time}>{time}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Action Section */}
        {onHelp && (
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={(e) => {
              e.stopPropagation();
              onHelp();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.helpText}>I Can Help</Text>
          </TouchableOpacity>
        )}
        
        {onFindNGO && (
          <TouchableOpacity 
            style={styles.ngoButton}
            onPress={(e) => {
              e.stopPropagation();
              onFindNGO();
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="search" size={18} color={theme.colors.white} />
            <Text style={styles.ngoText}>Find NGO</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl + 4,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 120,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: theme.borderRadius.xl + 4,
    borderBottomRightRadius: theme.borderRadius.xl + 4,
    overflow: 'hidden',
  },
  overlayBlur: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  overlayContent: {
    padding: theme.spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  caseId: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    marginBottom: 4,
  },
  animalName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  condition: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  location: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  time: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
  },
  helpButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
    letterSpacing: 0.3,
  },
  ngoButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  ngoText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
    letterSpacing: 0.3,
  },
});
