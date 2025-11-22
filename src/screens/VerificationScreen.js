/**
 * Verification Screen
 * Display verification status and allow document uploads
 */
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../config/supabase';
import toast from '../utils/toast';

export default function VerificationScreen({ navigation }) {
  const { user, profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const insets = useSafeAreaInsets();

  const verificationStatus = profile?.verification?.status || 'not_submitted';
  const isNGO = profile?.user_type === 'ngo';
  const isVolunteer = profile?.user_type === 'volunteer';

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('verification_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Error', 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const getRequiredDocuments = () => {
    if (isNGO) {
      return [
        { type: 'registration_certificate', label: 'NGO Registration Certificate', icon: 'description' },
        { type: 'location_proof', label: 'Location Proof Document', icon: 'location-on' },
        { type: 'authorization_letter', label: 'Authorization Letter', icon: 'verified-user' },
      ];
    } else if (isVolunteer) {
      return [
        { type: 'government_id', label: 'Government ID (Aadhaar/PAN/DL)', icon: 'badge' },
        { type: 'photo', label: 'Profile Photo', icon: 'photo-camera' },
        { type: 'address_proof', label: 'Address Proof', icon: 'home' },
      ];
    }
    return [];
  };

  const hasDocument = (docType) => {
    return documents.some((doc) => doc.document_type === docType);
  };

  const getDocumentStatus = (docType) => {
    const doc = documents.find((d) => d.document_type === docType);
    return doc?.verification_status || 'not_uploaded';
  };

  const pickDocument = async (docType, label) => {
    try {
      // For photo type, use image picker
      if (docType === 'photo') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          toast.error('Permission Denied', 'Camera roll permission is required');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          await uploadDocument(docType, label, result.assets[0].uri, 'image/jpeg');
        }
      } else {
        // For other documents, use document picker
        const result = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
          copyToCacheDirectory: true,
        });

        if (result.type === 'success') {
          await uploadDocument(docType, label, result.uri, result.mimeType);
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      toast.error('Error', 'Failed to pick document');
    }
  };

  const uploadDocument = async (docType, label, uri, mimeType) => {
    try {
      setUploadingDoc(docType);

      // Get file extension
      const ext = uri.split('.').pop();
      const fileName = `${user.id}/${docType}_${Date.now()}.${ext}`;

      // Upload to Supabase Storage
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verification-docs')
        .upload(fileName, blob, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verification-docs')
        .getPublicUrl(fileName);

      // Save document record
      const { data: docData, error: docError } = await supabase
        .from('verification_documents')
        .insert({
          user_id: user.id,
          document_type: docType,
          file_url: publicUrl,
          file_name: fileName,
          file_size: blob.size,
          mime_type: mimeType,
          verification_status: 'pending',
        })
        .select()
        .single();

      if (docError) throw docError;

      toast.success('Success', `${label} uploaded successfully`);
      setDocuments([docData, ...documents]);

      // Update profile verification status if all documents uploaded
      await checkAndUpdateVerificationStatus();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Error', 'Failed to upload document');
    } finally {
      setUploadingDoc(null);
    }
  };

  const checkAndUpdateVerificationStatus = async () => {
    const requiredDocs = getRequiredDocuments();
    const allUploaded = requiredDocs.every((doc) => hasDocument(doc.type));

    if (allUploaded && verificationStatus === 'not_submitted') {
      // Update profile verification status to pending
      await updateProfile({
        verification: {
          status: 'pending',
          submittedAt: new Date().toISOString(),
        },
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return theme.colors.success;
      case 'pending':
        return theme.colors.warning;
      case 'rejected':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return 'check-circle';
      case 'pending':
        return 'schedule';
      case 'rejected':
        return 'cancel';
      default:
        return 'upload-file';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Verified';
      case 'pending':
        return 'Under Review';
      case 'rejected':
        return 'Rejected';
      case 'not_uploaded':
        return 'Not Uploaded';
      default:
        return 'Not Submitted';
    }
  };

  if (loading && documents.length === 0) {
    return <LoadingSpinner fullScreen message="Loading verification status..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 140,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <MaterialIcons
            name={verificationStatus === 'approved' ? 'verified' : 'verified-user'}
            size={48}
            color={getStatusColor(verificationStatus)}
          />
          <Text style={styles.title}>Verification Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(verificationStatus) + '20' }]}>
            <MaterialIcons
              name={getStatusIcon(verificationStatus)}
              size={20}
              color={getStatusColor(verificationStatus)}
            />
            <Text style={[styles.statusText, { color: getStatusColor(verificationStatus) }]}>
              {getStatusText(verificationStatus)}
            </Text>
          </View>
        </View>

        {verificationStatus === 'approved' && (
          <GlassCard variant="primary" intensity={85} style={styles.successCard}>
            <MaterialIcons name="check-circle" size={32} color={theme.colors.success} />
            <Text style={styles.successTitle}>Verification Complete!</Text>
            <Text style={styles.successText}>
              Your account has been verified. You can now receive notifications about animal rescue cases in your service areas.
            </Text>
          </GlassCard>
        )}

        {verificationStatus === 'pending' && (
          <GlassCard variant="secondary" intensity={80} style={styles.infoCard}>
            <MaterialIcons name="schedule" size={24} color={theme.colors.warning} />
            <Text style={styles.infoText}>
              Your documents are under review. This usually takes 1-2 business days. We'll notify you once the review is complete.
            </Text>
          </GlassCard>
        )}

        {verificationStatus === 'rejected' && profile?.verification?.reviewNotes && (
          <GlassCard variant="light" intensity={80} style={styles.rejectionCard}>
            <MaterialIcons name="error" size={24} color={theme.colors.error} />
            <Text style={styles.rejectionTitle}>Verification Rejected</Text>
            <Text style={styles.rejectionText}>{profile.verification.reviewNotes}</Text>
            <Text style={styles.rejectionAction}>Please upload the required documents again.</Text>
          </GlassCard>
        )}

        <GlassCard variant="light" intensity={80} style={styles.documentsCard}>
          <Text style={styles.sectionTitle}>Required Documents</Text>
          <Text style={styles.sectionSubtitle}>
            {isNGO ? 'Upload NGO verification documents' : 'Upload volunteer verification documents'}
          </Text>

          {getRequiredDocuments().map((doc) => {
            const status = getDocumentStatus(doc.type);
            const isUploading = uploadingDoc === doc.type;

            return (
              <View key={doc.type} style={styles.documentItem}>
                <View style={styles.documentInfo}>
                  <MaterialIcons name={doc.icon} size={24} color={theme.colors.primary} />
                  <View style={styles.documentText}>
                    <Text style={styles.documentLabel}>{doc.label}</Text>
                    <View style={styles.documentStatus}>
                      <MaterialIcons
                        name={getStatusIcon(status)}
                        size={14}
                        color={getStatusColor(status)}
                      />
                      <Text style={[styles.documentStatusText, { color: getStatusColor(status) }]}>
                        {getStatusText(status)}
                      </Text>
                    </View>
                  </View>
                </View>
                {isUploading ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <TouchableOpacity
                    onPress={() => pickDocument(doc.type, doc.label)}
                    style={styles.uploadButton}
                    disabled={status === 'approved'}
                  >
                    <MaterialIcons
                      name={hasDocument(doc.type) ? 'refresh' : 'upload'}
                      size={20}
                      color={status === 'approved' ? theme.colors.textTertiary : theme.colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </GlassCard>

        {verificationStatus === 'not_submitted' && (
          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={20} color={theme.colors.info} />
            <Text style={styles.infoBoxText}>
              Upload all required documents to submit your verification request. Once submitted, our team will review your documents within 1-2 business days.
            </Text>
          </View>
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
  scrollContent: {
    // Dynamic padding applied inline
  },
  header: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  statusText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  successCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.success,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  successText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  rejectionCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  rejectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.error,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  rejectionText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 22,
  },
  rejectionAction: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  documentsCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  documentText: {
    flex: 1,
  },
  documentLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing.xs,
  },
  documentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  documentStatusText: {
    fontSize: theme.typography.fontSize.sm,
  },
  uploadButton: {
    padding: theme.spacing.sm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.infoBackground,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  infoBoxText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.info,
    lineHeight: 20,
  },
});
