/**
 * Image Picker Component
 * Integrates Expo Image Picker for gallery selection
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as ExpoImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import GlassButton from './GlassButton';

export default function ImagePicker({ onSelect, onClose, multiple = false, maxImages = 5 }) {
  const [permission, requestPermission] = ExpoImagePicker.useMediaLibraryPermissions();

  const handlePickFromGallery = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Permission Required',
          'Please enable photo library access in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    try {
      const result = await ExpoImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: multiple,
        selectionLimit: multiple ? maxImages : 1,
        quality: 0.8,
        exif: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (multiple) {
          onSelect(result.assets);
        } else {
          onSelect(result.assets[0]);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialIcons name="photo-library" size={64} color={theme.colors.primary} />
        <Text style={styles.title}>Select Photos</Text>
        <Text style={styles.description}>
          {multiple 
            ? `Choose up to ${maxImages} photos from your gallery`
            : 'Choose a photo from your gallery'
          }
        </Text>

        <View style={styles.buttons}>
          <GlassButton
            title="Open Gallery"
            onPress={handlePickFromGallery}
            variant="primary"
            icon={<MaterialIcons name="photo-library" size={18} color="#fff" />}
          />
          <GlassButton
            title="Cancel"
            onPress={onClose}
            variant="light"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  content: {
    alignItems: 'center',
    gap: theme.spacing.lg,
    maxWidth: 400,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttons: {
    width: '100%',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
});
