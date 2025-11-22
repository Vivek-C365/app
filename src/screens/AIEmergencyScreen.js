/**
 * AI Emergency Assistance Screen
 * Provides AI-powered emergency guidance when no volunteers respond
 */
import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { theme } from '../theme';
import LoadingSpinner from '../components/LoadingSpinner';
import GlassButton from '../components/GlassButton';
import aiService from '../services/aiService';
import caseService from '../services/caseService';
import toast from '../utils/toast';

export default function AIEmergencyScreen({ route, navigation }) {
  const { caseId } = route.params;
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);
  const chatScrollRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState(null);
  const [activeTab, setActiveTab] = useState('facilities'); // 'facilities', 'chat', 'instructions', 'analysis'
  const [facilities, setFacilities] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [instructions, setInstructions] = useState([]);
  const [photoAnalysis, setPhotoAnalysis] = useState(null);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [loadingInstructions, setLoadingInstructions] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    initializeEmergencyAssistance();
  }, [caseId]);

  const initializeEmergencyAssistance = async () => {
    try {
      setLoading(true);

      // Fetch case details
      const caseResponse = await caseService.getCaseById(caseId);
      if (caseResponse.success && caseResponse.case) {
        setCaseData(caseResponse.case);
        
        // Activate AI emergency assistance
        await aiService.activateEmergencyAssistance(caseId);
        
        // Load facilities and instructions in parallel
        loadFacilities(caseResponse.case);
        loadEmergencyInstructions(caseResponse.case);
        
        // Add welcome message to chat
        setChatMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I'm here to help you with emergency assistance for this ${caseResponse.case.animalType}. I can provide facility recommendations, emergency care instructions, and answer your questions. How can I assist you?`,
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (error) {
      console.error('Initialize emergency assistance error:', error);
      toast.error('Failed to initialize', 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const loadFacilities = async (caseInfo) => {
    try {
      setLoadingFacilities(true);
      const location = caseInfo.location?.coordinates 
        ? { latitude: caseInfo.location.coordinates[1], longitude: caseInfo.location.coordinates[0] }
        : null;
      
      if (!location) {
        toast.info('Location Required', 'Unable to find facilities without location');
        return;
      }

      const response = await aiService.getFacilityRecommendations(
        caseId,
        location,
        caseInfo.animalType
      );

      if (response.success) {
        setFacilities(response.facilities || []);
      }
    } catch (error) {
      console.error('Load facilities error:', error);
    } finally {
      setLoadingFacilities(false);
    }
  };

  const loadEmergencyInstructions = async (caseInfo) => {
    try {
      setLoadingInstructions(true);
      const response = await aiService.getEmergencyInstructions(
        caseId,
        caseInfo.animalType,
        caseInfo.condition,
        caseInfo.photos || []
      );

      if (response.success) {
        setInstructions(response.instructions || []);
      }
    } catch (error) {
      console.error('Load instructions error:', error);
    } finally {
      setLoadingInstructions(false);
    }
  };

  const loadPhotoAnalysis = async () => {
    if (!caseData?.photos || caseData.photos.length === 0) {
      toast.info('No Photos', 'No photos available for analysis');
      return;
    }

    try {
      setLoadingAnalysis(true);
      const response = await aiService.analyzeAnimalPhotos(
        caseData.photos,
        caseData.animalType
      );

      if (response.success) {
        setPhotoAnalysis(response);
      }
    } catch (error) {
      console.error('Load photo analysis error:', error);
      toast.error('Analysis Failed', 'Unable to analyze photos');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const sendChatMessage = async () => {
    if (!messageText.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setMessageText('');
    setSendingMessage(true);

    try {
      const response = await aiService.sendAIChatMessage(
        caseId,
        userMessage.content,
        chatMessages
      );

      if (response.success) {
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.response,
          suggestions: response.suggestions,
          timestamp: new Date().toISOString(),
        };
        setChatMessages(prev => [...prev, assistantMessage]);
        
        // Scroll to bottom
        setTimeout(() => {
          chatScrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Send chat message error:', error);
      toast.error('Message Failed', 'Unable to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCallFacility = (facility) => {
    if (!facility.phone) {
      toast.info('No Phone', 'Phone number not available');
      return;
    }

    Alert.alert(
      'Call Facility',
      `Call ${facility.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${facility.phone}`);
          },
        },
      ]
    );
  };

  const handleNavigateToFacility = (facility) => {
    if (!facility.location?.latitude || !facility.location?.longitude) {
      toast.info('No Location', 'Location not available');
      return;
    }

    const url = Platform.select({
      ios: `maps:0,0?q=${facility.location.latitude},${facility.location.longitude}`,
      android: `geo:0,0?q=${facility.location.latitude},${facility.location.longitude}(${facility.name})`,
    });

    Linking.openURL(url).catch(() => {
      toast.error('Navigation Failed', 'Unable to open maps');
    });
  };

  const renderFacilitiesTab = () => (
    <View style={styles.tabContent}>
      {loadingFacilities ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Finding nearby facilities...</Text>
        </View>
      ) : facilities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="location-off" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>No facilities found nearby</Text>
          <Text style={styles.emptySubtext}>Try using the chat for alternative suggestions</Text>
        </View>
      ) : (
        <ScrollView style={styles.facilitiesList} showsVerticalScrollIndicator={false}>
          {facilities.map((facility, index) => (
            <View key={index} style={styles.facilityCard}>
              <View style={styles.facilityHeader}>
                <MaterialIcons 
                  name={facility.type === 'hospital' ? 'local-hospital' : 'home'} 
                  size={24} 
                  color={theme.colors.primary} 
                />
                <View style={styles.facilityInfo}>
                  <Text style={styles.facilityName}>{facility.name}</Text>
                  {facility.specialization && (
                    <Text style={styles.facilitySpecialization}>{facility.specialization}</Text>
                  )}
                </View>
              </View>

              {facility.address && (
                <Text style={styles.facilityAddress}>{facility.address}</Text>
              )}

              {facility.distance && (
                <View style={styles.facilityMeta}>
                  <MaterialIcons name="place" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.facilityMetaText}>{facility.distance}</Text>
                </View>
              )}

              {facility.hours && (
                <View style={styles.facilityMeta}>
                  <MaterialIcons name="access-time" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.facilityMetaText}>{facility.hours}</Text>
                </View>
              )}

              <View style={styles.facilityActions}>
                <GlassButton
                  title="Call"
                  onPress={() => handleCallFacility(facility)}
                  icon="phone"
                  variant="primary"
                  style={styles.facilityButton}
                />
                <GlassButton
                  title="Navigate"
                  onPress={() => handleNavigateToFacility(facility)}
                  icon="directions"
                  variant="secondary"
                  style={styles.facilityButton}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderChatTab = () => (
    <KeyboardAvoidingView 
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView 
        ref={chatScrollRef}
        style={styles.chatMessages}
        contentContainerStyle={styles.chatMessagesContent}
        showsVerticalScrollIndicator={false}
      >
        {chatMessages.map((message) => (
          <View 
            key={message.id} 
            style={[
              styles.chatMessage,
              message.role === 'user' ? styles.userMessage : styles.assistantMessage
            ]}
          >
            <Text style={[
              styles.chatMessageText,
              message.role === 'user' ? styles.userMessageText : styles.assistantMessageText
            ]}>
              {message.content}
            </Text>
            {message.suggestions && message.suggestions.length > 0 && (
              <View style={styles.suggestions}>
                {message.suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionChip}
                    onPress={() => setMessageText(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
        {sendingMessage && (
          <View style={[styles.chatMessage, styles.assistantMessage]}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        )}
      </ScrollView>

      <View style={styles.chatInputContainer}>
        <TextInput
          style={styles.chatInput}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Ask for help..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={sendChatMessage}
          disabled={!messageText.trim() || sendingMessage}
        >
          <MaterialIcons 
            name="send" 
            size={24} 
            color={messageText.trim() ? theme.colors.primary : theme.colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderInstructionsTab = () => (
    <View style={styles.tabContent}>
      {loadingInstructions ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Generating instructions...</Text>
        </View>
      ) : instructions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="info-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>No instructions available</Text>
        </View>
      ) : (
        <ScrollView style={styles.instructionsList} showsVerticalScrollIndicator={false}>
          <View style={styles.warningBanner}>
            <MaterialIcons name="warning" size={24} color={theme.colors.warning} />
            <Text style={styles.warningText}>
              These are AI-generated suggestions. Always prioritize professional veterinary care.
            </Text>
          </View>

          {instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionCard}>
              <View style={styles.instructionHeader}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.instructionTitle}>{instruction.title}</Text>
              </View>
              <Text style={styles.instructionDescription}>{instruction.description}</Text>
              {instruction.warning && (
                <View style={styles.instructionWarning}>
                  <MaterialIcons name="error-outline" size={16} color={theme.colors.error} />
                  <Text style={styles.instructionWarningText}>{instruction.warning}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderAnalysisTab = () => (
    <View style={styles.tabContent}>
      {!photoAnalysis && !loadingAnalysis ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="photo-camera" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>Photo Analysis</Text>
          <Text style={styles.emptySubtext}>
            {caseData?.photos?.length > 0 
              ? 'Tap below to analyze animal photos' 
              : 'No photos available for analysis'}
          </Text>
          {caseData?.photos?.length > 0 && (
            <GlassButton
              title="Analyze Photos"
              onPress={loadPhotoAnalysis}
              icon="analytics"
              variant="primary"
              style={styles.analyzeButton}
            />
          )}
        </View>
      ) : loadingAnalysis ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Analyzing photos...</Text>
        </View>
      ) : (
        <ScrollView style={styles.analysisList} showsVerticalScrollIndicator={false}>
          <View style={styles.analysisCard}>
            <Text style={styles.analysisTitle}>AI Analysis</Text>
            <Text style={styles.analysisText}>{photoAnalysis.analysis}</Text>
          </View>

          {photoAnalysis.injuryAssessment && (
            <View style={styles.analysisCard}>
              <Text style={styles.analysisTitle}>Injury Assessment</Text>
              <View style={styles.assessmentItem}>
                <Text style={styles.assessmentLabel}>Severity:</Text>
                <Text style={[
                  styles.assessmentValue,
                  { color: getSeverityColor(photoAnalysis.injuryAssessment.severity) }
                ]}>
                  {photoAnalysis.injuryAssessment.severity}
                </Text>
              </View>
              {photoAnalysis.injuryAssessment.details && (
                <Text style={styles.assessmentDetails}>{photoAnalysis.injuryAssessment.details}</Text>
              )}
            </View>
          )}

          {photoAnalysis.recommendedActions && photoAnalysis.recommendedActions.length > 0 && (
            <View style={styles.analysisCard}>
              <Text style={styles.analysisTitle}>Recommended Actions</Text>
              {photoAnalysis.recommendedActions.map((action, index) => (
                <View key={index} style={styles.actionItem}>
                  <MaterialIcons name="check-circle" size={20} color={theme.colors.success} />
                  <Text style={styles.actionText}>{action}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return theme.colors.error;
      case 'high': return theme.colors.warning;
      case 'medium': return theme.colors.info;
      case 'low': return theme.colors.success;
      default: return theme.colors.textPrimary;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AI Emergency Assistance</Text>
          <Text style={styles.headerSubtitle}>Case #{caseData?.id?.slice(0, 8)}</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'facilities' && styles.activeTab]}
          onPress={() => setActiveTab('facilities')}
        >
          <MaterialIcons 
            name="local-hospital" 
            size={20} 
            color={activeTab === 'facilities' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'facilities' && styles.activeTabText]}>
            Facilities
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
          onPress={() => setActiveTab('chat')}
        >
          <MaterialIcons 
            name="chat" 
            size={20} 
            color={activeTab === 'chat' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>
            Chat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'instructions' && styles.activeTab]}
          onPress={() => setActiveTab('instructions')}
        >
          <MaterialIcons 
            name="list" 
            size={20} 
            color={activeTab === 'instructions' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'instructions' && styles.activeTabText]}>
            Instructions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'analysis' && styles.activeTab]}
          onPress={() => setActiveTab('analysis')}
        >
          <MaterialIcons 
            name="analytics" 
            size={20} 
            color={activeTab === 'analysis' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'analysis' && styles.activeTabText]}>
            Analysis
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'facilities' && renderFacilitiesTab()}
      {activeTab === 'chat' && renderChatTab()}
      {activeTab === 'instructions' && renderInstructionsTab()}
      {activeTab === 'analysis' && renderAnalysisTab()}
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
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tabBar: {
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
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  tabContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  analyzeButton: {
    marginTop: theme.spacing.lg,
  },
  facilitiesList: {
    flex: 1,
    padding: theme.spacing.md,
  },
  facilityCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  facilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  facilityInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  facilityName: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  facilitySpecialization: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  facilityAddress: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  facilityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  facilityMetaText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  facilityActions: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  facilityButton: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  chatMessages: {
    flex: 1,
    padding: theme.spacing.md,
  },
  chatMessagesContent: {
    paddingBottom: theme.spacing.md,
  },
  chatMessage: {
    maxWidth: '80%',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chatMessageText: {
    fontSize: theme.typography.fontSize.md,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: theme.colors.textPrimary,
  },
  suggestions: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  suggestionChip: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  suggestionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  chatInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendButton: {
    marginLeft: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  instructionsList: {
    flex: 1,
    padding: theme.spacing.md,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warningLight || 'rgba(255, 193, 7, 0.1)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning,
  },
  instructionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  instructionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  instructionNumberText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  instructionTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  instructionDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  instructionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.errorLight || 'rgba(244, 67, 54, 0.1)',
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
  },
  instructionWarningText: {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
  },
  analysisList: {
    flex: 1,
    padding: theme.spacing.md,
  },
  analysisCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  analysisTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  analysisText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  assessmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  assessmentLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.xs,
  },
  assessmentValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  assessmentDetails: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  actionText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
});
