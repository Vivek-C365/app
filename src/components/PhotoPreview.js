/**
 * Photo Preview Component
 * Displays and allows editing of captured/selected photos
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import GlassButton from './GlassButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_SIZE = SCREEN_WIDTH - (theme.spacing.xl * 2);

export default function PhotoPreview({ photos, onConfirm, onRetake, onRemove, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleRemove = (index) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onRemove(index);
            if (index === currentIndex && currentIndex > 0) {
              setCurrentIndex(currentIndex - 1);
            }
          },
        },
      ]
    );
  };

  const currentPhoto = photos[currentIndex];

  // Safety check - if no photos or current photo is invalid, show error
  if (!photos || photos.length === 0 || !currentPhoto) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <MaterialIcons name="close" size={28} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>No Photos</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.previewContainer}>
          <MaterialIcons name="photo" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>No photos to preview</Text>
        </View>
        <View style={styles.actions}>
          <GlassButton
            title="Close"
            onPress={onClose}
            variant="light"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onClose}
        >
          <MaterialIcons name="close" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'}
        </Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => handleRemove(currentIndex)}
        >
          <MaterialIcons name="delete" size={28} color={theme.colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.previewContainer}>
        {currentPhoto && currentPhoto.uri ? (
          <Image
            source={{ uri: currentPhoto.uri }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.previewImage}>
            <MaterialIcons name="broken-image" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>Invalid photo</Text>
          </View>
        )}
        
        {photos.length > 1 && (
          <View style={styles.navigation}>
            <TouchableOpacity
              style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
              onPress={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              <MaterialIcons 
                name="chevron-left" 
                size={32} 
                color={currentIndex === 0 ? theme.colors.textSecondary : theme.colors.textPrimary} 
              />
            </TouchableOpacity>
            
            <Text style={styles.pageIndicator}>
              {currentIndex + 1} / {photos.length}
            </Text>
            
            <TouchableOpacity
              style={[styles.navButton, currentIndex === photos.length - 1 && styles.navButtonDisabled]}
              onPress={() => setCurrentIndex(Math.min(photos.length - 1, currentIndex + 1))}
              disabled={currentIndex === photos.length - 1}
            >
              <MaterialIcons 
                name="chevron-right" 
                size={32} 
                color={currentIndex === photos.length - 1 ? theme.colors.textSecondary : theme.colors.textPrimary} 
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {photos.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailContainer}
        >
          {photos.map((photo, index) => (
            photo && photo.uri ? (
              <TouchableOpacity
                key={index}
                onPress={() => setCurrentIndex(index)}
                style={[
                  styles.thumbnail,
                  index === currentIndex && styles.thumbnailActive,
                ]}
              >
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.thumbnailImage}
                />
                {index === currentIndex && (
                  <View style={styles.thumbnailOverlay}>
                    <MaterialIcons name="check-circle" size={24} color={theme.colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            ) : null
          ))}
        </ScrollView>
      )}

      <View style={styles.info}>
        <View style={styles.infoRow}>
          <MaterialIcons name="info" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>
            Photos will be compressed before upload to save data
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <GlassButton
          title="Retake"
          onPress={onRetake}
          variant="light"
          icon={<MaterialIcons name="camera-alt" size={18} color={theme.colors.textPrimary} />}
        />
        <GlassButton
          title="Use Photos"
          onPress={onConfirm}
          variant="primary"
          icon={<MaterialIcons name="check" size={18} color="#fff" />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 50,
    paddingBottom: theme.spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  previewImage: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: theme.borderRadius.lg,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: theme.spacing.lg,
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  pageIndicator: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  thumbnailContainer: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: theme.colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 40,
  },
});
