/**
 * Document Preview Component
 * Displays preview of verification documents (images and PDFs)
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import GlassButton from './GlassButton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DocumentPreview({ 
  visible, 
  documentUri, 
  documentType,
  mimeType,
  onConfirm, 
  onRetake, 
  onClose 
}) {
  const isImage = mimeType?.startsWith('image/');
  const isPDF = mimeType === 'application/pdf';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <MaterialIcons name="close" size={28} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Document Preview</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.previewContainer}>
          {isImage && documentUri ? (
            <Image
              source={{ uri: documentUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : isPDF ? (
            <View style={styles.pdfPlaceholder}>
              <MaterialIcons name="picture-as-pdf" size={64} color={theme.colors.primary} />
              <Text style={styles.pdfText}>PDF Document</Text>
              <Text style={styles.pdfSubtext}>
                Document will be uploaded and reviewed by admin
              </Text>
            </View>
          ) : (
            <View style={styles.pdfPlaceholder}>
              <MaterialIcons name="description" size={64} color={theme.colors.textSecondary} />
              <Text style={styles.pdfText}>Document Selected</Text>
              <Text style={styles.pdfSubtext}>
                Document will be uploaded for verification
              </Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.infoRow}>
            <MaterialIcons name="info" size={20} color={theme.colors.info} />
            <Text style={styles.infoText}>
              Make sure the document is clear and all text is readable. 
              {isImage && ' The image will be compressed before upload.'}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <GlassButton
            title="Retake"
            onPress={onRetake}
            variant="light"
            icon={<MaterialIcons name="refresh" size={18} color={theme.colors.textPrimary} />}
            style={styles.actionButton}
          />
          <GlassButton
            title="Upload"
            onPress={onConfirm}
            variant="primary"
            icon={<MaterialIcons name="upload" size={18} color="#fff" />}
            style={styles.actionButton}
          />
        </View>
      </View>
    </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
    width: SCREEN_WIDTH - (theme.spacing.xl * 2),
    height: SCREEN_HEIGHT * 0.6,
    borderRadius: theme.borderRadius.lg,
  },
  pdfPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
  },
  pdfText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  pdfSubtext: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  info: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.infoBackground,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.info,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 40,
    paddingTop: theme.spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
});
