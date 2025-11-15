/**
 * Case Details Screen
 * Displays full case information with messaging, photo gallery, and timeline
 */
import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Dimensions,
  RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { theme } from '../theme';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import GlassButton from '../components/GlassButton';
import apiService from '../../services/api';
import toast from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CaseDetailsScreen({ route, navigation }) {
  const { caseId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'messages', 'timeline'
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [expandedTimelineItems, setExpandedTimelineItems] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCaseDetails();
    fetchMessages();
    fetchTimeline();
  }, [caseId]);

  // Refresh data when screen comes into focus (e.g., after adding status update)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCaseDetails();
      fetchTimeline();
      fetchMessages();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchCaseDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCaseById(caseId);
      if (response.success && response.data) {
        setCaseData(response.data);
      }
    } catch (error) {
      toast.error('Failed to load case', 'Please try again');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await apiService.getMessages(caseId);
      if (response.success && response.data) {
        setMessages(response.data.messages || []);
      }
    } catch (error) {
      console.log('Error fetching messages:', error);
    }
  };

  const fetchTimeline = async () => {
    try {
      const response = await apiService.getCaseTimeline(caseId);
      if (response.success && response.data) {
        setTimeline(response.data.timeline || []);
      }
    } catch (error) {
      console.log('Error fetching timeline:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      setSendingMessage(true);
      const response = await apiService.sendMessage(caseId, {
        content: messageText.trim(),
        messageType: 'text',
        priority: 'normal'
      });

      if (response.success) {
        setMessages([...messages, response.data]);
        setMessageText('');
        setTimeout(() => messagesEndRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (error) {
      toast.error('Failed to send message', 'Please try again');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCallReporter = () => {
    if (caseData?.contactInfo?.phone) {
      Linking.openURL(`tel:${caseData.contactInfo.phone}`);
    }
  };

  const handleOpenMap = () => {
    if (caseData?.location?.coordinates && caseData.location.coordinates.length === 2) {
      const [lng, lat] = caseData.location.coordinates;
      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        android: `geo:0,0?q=${lat},${lng}`
      });
      Linking.openURL(url);
    }
  };

  const handleShare = () => {
    toast.info('Share', 'Share functionality coming soon');
  };

  const handleAddStatusUpdate = () => {
    // Navigate to status update screen or show modal
    navigation.navigate('AddStatusUpdate', { caseId });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchCaseDetails(),
      fetchTimeline(),
      fetchMessages()
    ]);
    setRefreshing(false);
  };

  const toggleTimelineItem = (index) => {
    setExpandedTimelineItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const isUserAssigned = () => {
    if (!user || !caseData) return false;
    const userId = user.id || user._id;
    return caseData.assignedHelpers?.some(helper => 
      (helper._id || helper.id || helper) === userId
    );
  };

  const capitalizeFirst = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ');
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading case details..." />;
  }

  if (!caseData) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color={theme.colors.textSecondary} />
        <Text style={styles.errorText}>Case not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{caseData.caseId}</Text>
          <StatusBadge status={capitalizeFirst(caseData.status)} size="small" />
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <MaterialIcons name="share" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'details' && styles.tabActive]}
          onPress={() => setActiveTab('details')}
        >
          <MaterialIcons 
            name="info" 
            size={20} 
            color={activeTab === 'details' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>
            Details
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.tabActive]}
          onPress={() => setActiveTab('messages')}
        >
          <MaterialIcons 
            name="chat" 
            size={20} 
            color={activeTab === 'messages' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>
            Messages
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'timeline' && styles.tabActive]}
          onPress={() => setActiveTab('timeline')}
        >
          <MaterialIcons 
            name="timeline" 
            size={20} 
            color={activeTab === 'timeline' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'timeline' && styles.tabTextActive]}>
            Timeline
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'details' && (
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 180 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        >
          {/* Photo Gallery */}
          {caseData.photos && caseData.photos.length > 0 && (
            <View style={styles.photoGallery}>
              <ScrollView 
                horizontal 
                pagingEnabled 
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                  setSelectedPhotoIndex(index);
                }}
              >
                {caseData.photos.map((photo, index) => (
                  <Image 
                    key={index} 
                    source={{ uri: photo }} 
                    style={styles.photo}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {caseData.photos.length > 1 && (
                <View style={styles.photoIndicator}>
                  {caseData.photos.map((_, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.photoIndicatorDot,
                        index === selectedPhotoIndex && styles.photoIndicatorDotActive
                      ]} 
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Animal Info */}
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <MaterialIcons name="pets" size={24} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Animal Type</Text>
                <Text style={styles.infoValue}>{capitalizeFirst(caseData.animalType)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialIcons name="healing" size={24} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Condition</Text>
                <Text style={styles.infoValue}>{capitalizeFirst(caseData.condition)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialIcons name="priority-high" size={24} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Urgency</Text>
                <Text style={[styles.infoValue, { color: getUrgencyColor(caseData.urgencyLevel) }]}>
                  {capitalizeFirst(caseData.urgencyLevel)}
                </Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{caseData.description}</Text>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            {caseData.location?.coordinates && caseData.location.coordinates.length === 2 && (
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: caseData.location.coordinates[1],
                    longitude: caseData.location.coordinates[0],
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: caseData.location.coordinates[1],
                      longitude: caseData.location.coordinates[0],
                    }}
                    title={caseData.animalType}
                  />
                </MapView>
                <TouchableOpacity style={styles.mapOverlay} onPress={handleOpenMap}>
                  <MaterialIcons name="open-in-new" size={20} color={theme.colors.white} />
                  <Text style={styles.mapOverlayText}>Open in Maps</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.locationInfo}>
              <MaterialIcons name="place" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.locationText}>
                {caseData.location?.address || caseData.location?.landmarks || 'Location not specified'}
              </Text>
            </View>
          </View>

          {/* Reporter Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reporter Contact</Text>
            <View style={styles.contactCard}>
              <View style={styles.contactRow}>
                <MaterialIcons name="person" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.contactText}>{caseData.contactInfo?.name || 'Anonymous'}</Text>
              </View>
              <View style={styles.contactRow}>
                <MaterialIcons name="phone" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.contactText}>{caseData.contactInfo?.phone}</Text>
              </View>
              {caseData.contactInfo?.email && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="email" size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.contactText}>{caseData.contactInfo.email}</Text>
                </View>
              )}
              <GlassButton
                title="Call Reporter"
                onPress={handleCallReporter}
                variant="primary"
                size="medium"
                icon={<MaterialIcons name="phone" size={18} color={theme.colors.white} />}
                style={{ marginTop: theme.spacing.md }}
              />
            </View>
          </View>

          {/* Assigned Helpers */}
          {caseData.assignedHelpers && caseData.assignedHelpers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assigned Helpers</Text>
              {caseData.assignedHelpers.map((helper, index) => (
                <View key={index} style={styles.helperCard}>
                  <MaterialIcons name="person" size={24} color={theme.colors.primary} />
                  <View style={styles.helperInfo}>
                    <Text style={styles.helperName}>{helper.name}</Text>
                    <Text style={styles.helperType}>{capitalizeFirst(helper.userType)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {activeTab === 'messages' && (
        <View style={styles.messagesContainer}>
          <ScrollView 
            ref={messagesEndRef}
            style={styles.messagesList}
            contentContainerStyle={[styles.messagesContent, { paddingBottom: insets.bottom + 160 }]}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyMessages}>
                <MaterialIcons name="chat-bubble-outline" size={64} color={theme.colors.textSecondary} />
                <Text style={styles.emptyMessagesText}>No messages yet</Text>
                <Text style={styles.emptyMessagesSubtext}>Start the conversation</Text>
              </View>
            ) : (
              messages.map((message, index) => {
                const isOwnMessage = message.senderId?._id === user?.id || message.senderId?._id === user?._id;
                const senderName = message.senderId?.name || 'System';
                
                return (
                  <View 
                    key={message._id || index} 
                    style={[
                      styles.messageBubble,
                      isOwnMessage ? styles.messageBubbleOwn : styles.messageBubbleOther
                    ]}
                  >
                    {!isOwnMessage && (
                      <Text style={styles.messageSender}>{senderName}</Text>
                    )}
                    <Text style={[
                      styles.messageText,
                      isOwnMessage && styles.messageTextOwn
                    ]}>
                      {message.content}
                    </Text>
                    <Text style={[
                      styles.messageTime,
                      isOwnMessage && styles.messageTimeOwn
                    ]}>
                      {formatTimeAgo(message.timestamp)}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Message Input */}
          <View style={[styles.messageInputContainer, { paddingBottom: insets.bottom + 80 }]}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor={theme.colors.textTertiary}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity 
              style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || sendingMessage}
            >
              <MaterialIcons 
                name="send" 
                size={24} 
                color={messageText.trim() ? theme.colors.white : theme.colors.textTertiary} 
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {activeTab === 'timeline' && (
        <ScrollView 
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer, 
            { paddingBottom: isUserAssigned() && caseData.status !== 'resolved' && caseData.status !== 'closed' 
              ? insets.bottom + 200 
              : insets.bottom + 100 
            }
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        >
          {timeline.length === 0 ? (
            <View style={styles.emptyTimeline}>
              <MaterialIcons name="timeline" size={64} color={theme.colors.textSecondary} />
              <Text style={styles.emptyTimelineText}>No timeline events yet</Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {timeline.map((event, index) => {
                const isExpanded = expandedTimelineItems[index];
                const hasDetails = event.details && Object.keys(event.details).length > 0;
                
                return (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.timelineItem}
                    onPress={() => hasDetails && toggleTimelineItem(index)}
                    activeOpacity={hasDetails ? 0.7 : 1}
                  >
                    <View style={styles.timelineIconContainer}>
                      <View style={[styles.timelineIcon, getTimelineIconStyle(event.type)]}>
                        <MaterialIcons 
                          name={getTimelineIcon(event.type)} 
                          size={16} 
                          color={theme.colors.white} 
                        />
                      </View>
                      {index < timeline.length - 1 && (
                        <View style={styles.timelineLine} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeader}>
                        <Text style={styles.timelineTitle}>{event.title || event.description}</Text>
                        {hasDetails && (
                          <MaterialIcons 
                            name={isExpanded ? 'expand-less' : 'expand-more'} 
                            size={20} 
                            color={theme.colors.textSecondary} 
                          />
                        )}
                      </View>
                      <Text style={styles.timelineTime}>{formatTimeAgo(event.timestamp)}</Text>
                      
                      {event.description && event.title && (
                        <Text style={styles.timelineDescription}>{event.description}</Text>
                      )}

                      {/* Expanded Details */}
                      {isExpanded && event.details && (
                        <View style={styles.timelineDetails}>
                          {/* Reporter Info */}
                          {event.details.reporter && (
                            <View style={styles.timelineDetailSection}>
                              <Text style={styles.timelineDetailTitle}>Reporter</Text>
                              <View style={styles.timelineDetailRow}>
                                <MaterialIcons name="person" size={16} color={theme.colors.textSecondary} />
                                <Text style={styles.timelineDetailText}>{event.details.reporter.name}</Text>
                              </View>
                              {event.details.reporter.phone && (
                                <View style={styles.timelineDetailRow}>
                                  <MaterialIcons name="phone" size={16} color={theme.colors.textSecondary} />
                                  <Text style={styles.timelineDetailText}>{event.details.reporter.phone}</Text>
                                </View>
                              )}
                            </View>
                          )}

                          {/* Helper Info */}
                          {event.details.helper && (
                            <View style={styles.timelineDetailSection}>
                              <Text style={styles.timelineDetailTitle}>Helper</Text>
                              <View style={styles.timelineDetailRow}>
                                <MaterialIcons name="person" size={16} color={theme.colors.textSecondary} />
                                <Text style={styles.timelineDetailText}>
                                  {event.details.helper.name}
                                  {event.details.helper.organization && ` (${event.details.helper.organization})`}
                                </Text>
                              </View>
                              <View style={styles.timelineDetailRow}>
                                <MaterialIcons name="badge" size={16} color={theme.colors.textSecondary} />
                                <Text style={styles.timelineDetailText}>{capitalizeFirst(event.details.helper.userType)}</Text>
                              </View>
                            </View>
                          )}

                          {/* Updated By Info */}
                          {event.details.updatedBy && (
                            <View style={styles.timelineDetailSection}>
                              <Text style={styles.timelineDetailTitle}>Updated By</Text>
                              <View style={styles.timelineDetailRow}>
                                <MaterialIcons name="person" size={16} color={theme.colors.textSecondary} />
                                <Text style={styles.timelineDetailText}>
                                  {event.details.updatedBy.name}
                                  {event.details.updatedBy.organization && ` (${event.details.updatedBy.organization})`}
                                </Text>
                              </View>
                            </View>
                          )}

                          {/* Animal & Condition */}
                          {event.details.animalType && (
                            <View style={styles.timelineDetailSection}>
                              <Text style={styles.timelineDetailTitle}>Animal Details</Text>
                              <View style={styles.timelineDetailRow}>
                                <MaterialIcons name="pets" size={16} color={theme.colors.textSecondary} />
                                <Text style={styles.timelineDetailText}>
                                  {capitalizeFirst(event.details.animalType)} - {capitalizeFirst(event.details.condition)}
                                </Text>
                              </View>
                              {event.details.urgencyLevel && (
                                <View style={styles.timelineDetailRow}>
                                  <MaterialIcons name="priority-high" size={16} color={theme.colors.textSecondary} />
                                  <Text style={[styles.timelineDetailText, { color: getUrgencyColor(event.details.urgencyLevel) }]}>
                                    {capitalizeFirst(event.details.urgencyLevel)} urgency
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}

                          {/* Status Change */}
                          {event.details.previousStatus && event.details.newStatus && (
                            <View style={styles.timelineDetailSection}>
                              <Text style={styles.timelineDetailTitle}>Status Change</Text>
                              <View style={styles.timelineDetailRow}>
                                <MaterialIcons name="swap-horiz" size={16} color={theme.colors.textSecondary} />
                                <Text style={styles.timelineDetailText}>
                                  {capitalizeFirst(event.details.previousStatus)} → {capitalizeFirst(event.details.newStatus)}
                                </Text>
                              </View>
                            </View>
                          )}

                          {/* Location */}
                          {event.details.location && (
                            <View style={styles.timelineDetailSection}>
                              <Text style={styles.timelineDetailTitle}>Location</Text>
                              <View style={styles.timelineDetailRow}>
                                <MaterialIcons name="place" size={16} color={theme.colors.textSecondary} />
                                <Text style={styles.timelineDetailText} numberOfLines={2}>
                                  {event.details.location}
                                </Text>
                              </View>
                            </View>
                          )}

                          {/* Full Description */}
                          {event.details.description && (
                            <View style={styles.timelineDetailSection}>
                              <Text style={styles.timelineDetailTitle}>Full Description</Text>
                              <Text style={styles.timelineDetailDescription}>
                                {event.details.description}
                              </Text>
                            </View>
                          )}

                          {/* Notes */}
                          {event.details.notes && (
                            <View style={styles.timelineDetailSection}>
                              <Text style={styles.timelineDetailTitle}>Notes</Text>
                              <Text style={styles.timelineDetailNotes}>
                                {event.details.notes}
                              </Text>
                            </View>
                          )}

                          {/* Duration */}
                          {event.details.duration && (
                            <View style={styles.timelineDetailRow}>
                              <MaterialIcons name="timer" size={16} color={theme.colors.textSecondary} />
                              <Text style={styles.timelineDetailText}>Duration: {event.details.duration}</Text>
                            </View>
                          )}
                        </View>
                      )}

                      {event.photoCount > 0 && (
                        <View style={styles.timelinePhotos}>
                          <MaterialIcons name="photo-library" size={16} color={theme.colors.primary} />
                          <Text style={styles.timelinePhotosText}>
                            {event.photoCount} photo{event.photoCount > 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Action Buttons */}
      {activeTab === 'details' && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 80 }]}>
          {caseData.status === 'open' ? (
            <GlassButton
              title="I Can Help"
              onPress={() => {
                apiService.assignCase(caseId, {})
                  .then(() => {
                    toast.success('Success', 'You have been assigned to this case');
                    fetchCaseDetails();
                    fetchTimeline();
                  })
                  .catch(() => toast.error('Failed', 'Could not assign case'));
              }}
              variant="accent"
              size="large"
              style={{ flex: 1 }}
            />
          ) : isUserAssigned() ? (
            <View style={styles.assignedBadge}>
              <MaterialIcons name="check-circle" size={20} color={theme.colors.success} />
              <Text style={styles.assignedText}>You are helping with this case</Text>
            </View>
          ) : (
            <View style={styles.assignedBadgeOther}>
              <MaterialIcons name="info" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.assignedTextOther}>Case is being handled</Text>
            </View>
          )}
        </View>
      )}

      {/* Status Update Button for Assigned Users */}
      {activeTab === 'timeline' && isUserAssigned() && caseData.status !== 'resolved' && caseData.status !== 'closed' && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 80 }]}>
          <GlassButton
            title="Add Status Update"
            onPress={handleAddStatusUpdate}
            variant="primary"
            size="large"
            icon={<MaterialIcons name="add" size={20} color={theme.colors.white} />}
            style={{ flex: 1 }}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const getUrgencyColor = (level) => {
  const colors = {
    low: theme.colors.success,
    medium: theme.colors.warning,
    high: theme.colors.error,
    critical: '#D32F2F'
  };
  return colors[level] || theme.colors.textSecondary;
};

const getTimelineIcon = (type) => {
  const icons = {
    created: 'add-circle',
    assigned: 'person-add',
    status_update: 'update',
    resolved: 'check-circle',
    transferred: 'transfer-within-a-station',
    ai_activated: 'smart-toy'
  };
  return icons[type] || 'circle';
};

const getTimelineIconStyle = (type) => {
  const colors = {
    created: theme.colors.primary,
    assigned: theme.colors.success,
    status_update: theme.colors.accent,
    resolved: theme.colors.success,
    transferred: theme.colors.warning,
    ai_activated: '#9C27B0'
  };
  return { backgroundColor: colors[type] || theme.colors.textSecondary };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  shareButton: {
    padding: theme.spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  photoGallery: {
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  photo: {
    width: SCREEN_WIDTH - theme.spacing.lg * 2,
    height: 300,
    backgroundColor: theme.colors.surface,
  },
  photoIndicator: {
    position: 'absolute',
    bottom: theme.spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  photoIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  photoIndicatorDotActive: {
    backgroundColor: theme.colors.white,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  description: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  mapContainer: {
    height: 200,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  mapOverlayText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  locationText: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  contactCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  contactText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
  },
  helperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  helperInfo: {
    flex: 1,
  },
  helperName: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  helperType: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: theme.spacing.lg,
  },
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 3,
  },
  emptyMessagesText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptyMessagesSubtext: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  messageBubbleOwn: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
  },
  messageBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  messageSender: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: theme.colors.white,
  },
  messageTime: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  messageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  messageInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendButton: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.surface,
  },
  timeline: {
    paddingVertical: theme.spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.xs,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  timelineTime: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  timelineDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
  },
  timelineDetails: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  timelineDetailSection: {
    gap: theme.spacing.xs,
  },
  timelineDetailTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  timelineDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  timelineDetailText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  timelineDetailDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
  timelineDetailNotes: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  timelinePhotos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  timelinePhotosText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  emptyTimeline: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 3,
  },
  emptyTimelineText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.success + '20',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  assignedText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.success,
  },
  assignedBadgeOther: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  assignedTextOther: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  errorText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
});
