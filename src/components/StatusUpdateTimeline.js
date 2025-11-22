/**
 * Status Update Timeline Component
 * Displays a chronological timeline of status updates with photos and details
 */
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function StatusUpdateTimeline({ timeline = [], onRefresh }) {
  const [expandedItems, setExpandedItems] = useState({});
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const toggleItem = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getConditionColor = (condition) => {
    switch (condition?.toLowerCase()) {
      case 'improving':
      case 'recovered':
        return theme.colors.success;
      case 'stable':
        return theme.colors.info;
      case 'deteriorating':
        return theme.colors.warning;
      case 'critical':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getConditionIcon = (condition) => {
    switch (condition?.toLowerCase()) {
      case 'improving':
      case 'recovered':
        return 'trending-up';
      case 'stable':
        return 'trending-flat';
      case 'deteriorating':
        return 'trending-down';
      case 'critical':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      open: 'Open',
      assigned: 'Assigned',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed',
    };
    return labels[status] || status;
  };

  if (!timeline || timeline.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="timeline" size={64} color={theme.colors.textTertiary} />
        <Text style={styles.emptyText}>No status updates yet</Text>
        <Text style={styles.emptySubtext}>
          Updates will appear here as the case progresses
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {timeline.map((update, index) => {
        const isExpanded = expandedItems[index];
        const isLast = index === timeline.length - 1;

        return (
          <View key={update.id || index} style={styles.timelineItem}>
            {/* Timeline Line */}
            <View style={styles.timelineLineContainer}>
              <View
                style={[
                  styles.timelineDot,
                  { backgroundColor: getConditionColor(update.condition) },
                ]}
              />
              {!isLast && <View style={styles.timelineLine} />}
            </View>

            {/* Content */}
            <TouchableOpacity
              style={styles.timelineContent}
              onPress={() => toggleItem(index)}
              activeOpacity={0.7}
            >
              {/* Header */}
              <View style={styles.updateHeader}>
                <View style={styles.updateHeaderLeft}>
                  <MaterialIcons
                    name={getConditionIcon(update.condition)}
                    size={20}
                    color={getConditionColor(update.condition)}
                  />
                  <Text style={styles.conditionText}>
                    {update.condition || 'Update'}
                  </Text>
                </View>
                <MaterialIcons
                  name={isExpanded ? 'expand-less' : 'expand-more'}
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </View>

              {/* Status Change */}
              {update.previous_status && update.new_status && (
                <View style={styles.statusChange}>
                  <Text style={styles.statusChangeText}>
                    {getStatusLabel(update.previous_status)}
                  </Text>
                  <MaterialIcons
                    name="arrow-forward"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.statusChangeText, styles.statusChangeNew]}>
                    {getStatusLabel(update.new_status)}
                  </Text>
                </View>
              )}

              {/* Timestamp and User */}
              <View style={styles.metaInfo}>
                <Text style={styles.timestamp}>{formatDate(update.timestamp)}</Text>
                {update.updated_by?.name && (
                  <>
                    <Text style={styles.metaSeparator}>•</Text>
                    <Text style={styles.userName}>{update.updated_by.name}</Text>
                  </>
                )}
              </View>

              {/* Photos Preview */}
              {update.photos && update.photos.length > 0 && (
                <View style={styles.photosPreview}>
                  {update.photos.slice(0, 3).map((photo, photoIndex) => (
                    <TouchableOpacity
                      key={photoIndex}
                      onPress={() => setSelectedPhoto(photo)}
                      style={styles.photoPreview}
                    >
                      <Image source={{ uri: photo }} style={styles.photoPreviewImage} />
                      {photoIndex === 2 && update.photos.length > 3 && (
                        <View style={styles.photoOverlay}>
                          <Text style={styles.photoOverlayText}>
                            +{update.photos.length - 3}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Expanded Details */}
              {isExpanded && (
                <View style={styles.expandedContent}>
                  {/* Description */}
                  {update.description && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Description</Text>
                      <Text style={styles.detailText}>{update.description}</Text>
                    </View>
                  )}

                  {/* Treatment */}
                  {update.treatment_provided && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Treatment Provided</Text>
                      <Text style={styles.detailText}>{update.treatment_provided}</Text>
                    </View>
                  )}

                  {/* Next Steps */}
                  {update.next_steps && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Next Steps</Text>
                      <Text style={styles.detailText}>{update.next_steps}</Text>
                    </View>
                  )}

                  {/* Location */}
                  {update.current_address && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Current Location</Text>
                      <Text style={styles.detailText}>{update.current_address}</Text>
                    </View>
                  )}

                  {/* All Photos */}
                  {update.photos && update.photos.length > 3 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>All Photos</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.allPhotos}>
                          {update.photos.map((photo, photoIndex) => (
                            <TouchableOpacity
                              key={photoIndex}
                              onPress={() => setSelectedPhoto(photo)}
                              style={styles.photoThumbnail}
                            >
                              <Image
                                source={{ uri: photo }}
                                style={styles.photoThumbnailImage}
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>
        );
      })}

      {/* Photo Modal */}
      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedPhoto(null)}
          >
            <View style={styles.modalContent}>
              <Image
                source={{ uri: selectedPhoto }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedPhoto(null)}
              >
                <MaterialIcons name="close" size={24} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  timelineLineContainer: {
    width: 40,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.sm,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  updateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  conditionText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    textTransform: 'capitalize',
  },
  statusChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
  },
  statusChangeText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  statusChangeNew: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  timestamp: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  },
  metaSeparator: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  },
  userName: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  photosPreview: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlayText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.white,
  },
  expandedContent: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailSection: {
    marginBottom: theme.spacing.md,
  },
  detailLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  detailText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  allPhotos: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  photoThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
