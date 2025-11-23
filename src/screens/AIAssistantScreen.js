/**
 * AI Assistant Screen
 * Standalone AI chat and assistance without case context
 */
import { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import MarkdownText from '../components/MarkdownText';
import { theme } from '../theme';
import aiService from '../services/aiService';
import locationService from '../services/locationService';
import toast from '../utils/toast';

export default function AIAssistantScreen() {
  const navigation = useNavigation();
  const chatScrollRef = useRef(null);
  const locationRef = useRef(null);
  
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // Hide tab bar when screen is focused
  useEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' }
    });
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: undefined
      });
    };
  }, [navigation]);

  // Fetch user location on mount
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        setLocationLoading(true);
        const location = await locationService.getCurrentLocation();
        const address = await locationService.reverseGeocode(
          location.latitude,
          location.longitude
        );
        
        const locationData = {
          ...location,
          address: address?.formattedAddress || 'Location detected',
          city: address?.city,
          region: address?.region,
        };
        
        setUserLocation(locationData);
        locationRef.current = locationData;
        
        console.log('User location fetched:', address?.formattedAddress);
      } catch (error) {
        console.log('Could not fetch location:', error.message);
        // Don't show error toast, just continue without location
      } finally {
        setLocationLoading(false);
      }
    };

    fetchLocation();
  }, []);

  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your AI assistant for animal rescue. I can help you with:\n\n• Emergency first aid guidance\n• Finding nearby animal hospitals and NGOs\n• Identifying animal species and conditions\n• Transportation advice\n• General animal welfare questions\n\nHow can I help you today?",
      timestamp: Date.now(),
    }
  ]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);

  // Quick action suggestions
  const quickActions = [
    { 
      id: 'emergency', 
      icon: 'local-hospital', 
      label: 'Emergency Help',
      prompt: 'I found an injured animal and need immediate help. What should I do?'
    },
    { 
      id: 'facilities', 
      icon: 'location-on', 
      label: 'Find Facilities',
      prompt: 'Can you help me find nearby animal hospitals and rescue centers?'
    },
    { 
      id: 'firstaid', 
      icon: 'healing', 
      label: 'First Aid',
      prompt: 'What first aid should I provide for an injured animal?'
    },
    { 
      id: 'transport', 
      icon: 'directions-car', 
      label: 'Transport',
      prompt: 'How should I safely transport an injured animal?'
    },
  ];

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (chatScrollRef.current) {
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages]);

  const handleSendMessage = async (text = messageText) => {
    if (!text.trim()) return;

    const userMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setMessageText('');
    setSendingMessage(true);

    try {
      // Use ref to get the latest location value
      const currentLocation = locationRef.current || userLocation;
      
      console.log('Sending message to AI:', text.trim());
      console.log('Final location being sent:', currentLocation);
      
      // Call AI service with location
      const response = await aiService.sendAIChatMessage({
        message: text.trim(),
        conversationHistory: chatMessages.slice(-10), // Last 10 messages for context
        userLocation: currentLocation, // Send location separately
      });

      console.log('AI response:', response);

      if (response.success && response.message) {
        const aiMessage = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: response.message,
          timestamp: Date.now(),
        };
        setChatMessages(prev => [...prev, aiMessage]);
      } else {
        console.error('AI response error:', response.error);
        throw new Error(response.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('AI chat error:', error);
      console.error('Error details:', error.message, error.stack);
      
      // Show user-friendly error
      toast.error('AI Error', error.message || 'Failed to get response');
      
      // Add error message to chat
      const errorMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. The AI service may be unavailable. Please try again in a moment or use the quick actions above.",
        timestamp: Date.now(),
        isError: true,
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleQuickAction = (action) => {
    setShowQuickActions(false);
    handleSendMessage(action.prompt);
  };

  const toggleQuickActions = () => {
    setShowQuickActions(!showQuickActions);
  };

  const renderMessage = (message) => {
    const isUser = message.role === 'user';
    
    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer
        ]}
      >
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userMessageBubble : styles.aiMessageBubble,
            message.isError && styles.errorMessageBubble
          ]}
        >
          {isUser ? (
            <Text style={[
              styles.messageText,
              styles.userMessageText
            ]}>
              {message.content}
            </Text>
          ) : (
            <MarkdownText style={styles.aiMessageText}>
              {message.content}
            </MarkdownText>
          )}
          <Text style={[
            styles.messageTime,
            isUser ? styles.userMessageTime : styles.aiMessageTime
          ]}>
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
        {isUser && (
          <View style={styles.userAvatar}>
            <MaterialIcons name="person" size={16} color={theme.colors.white} />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.aiIconContainer}>
              <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>AI Assistant</Text>
              <View style={styles.statusRow}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: sendingMessage ? theme.colors.warning : theme.colors.success }
                ]} />
                <Text style={styles.headerSubtitle}>
                  {sendingMessage ? 'Thinking...' : locationLoading ? 'Getting location...' : userLocation ? userLocation.city || 'Ready to help' : 'Ready to help'}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        {showQuickActions && (
          <View style={styles.quickActionsContainer}>
            <View style={styles.quickActionsHeader}>
              <Text style={styles.quickActionsTitle}>How can I help you?</Text>
              {chatMessages.length > 1 && (
                <TouchableOpacity onPress={toggleQuickActions}>
                  <MaterialIcons name="close" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            {locationLoading ? (
              <View style={styles.locationLoadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.locationLoadingText}>
                  Getting your location for better recommendations...
                </Text>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickActionsScroll}
              >
                {quickActions.map(action => (
                  <TouchableOpacity
                    key={action.id}
                    style={styles.quickActionButton}
                    onPress={() => handleQuickAction(action)}
                    disabled={sendingMessage}
                    activeOpacity={0.7}
                  >
                    <View style={styles.quickActionIcon}>
                      <MaterialIcons 
                        name={action.icon} 
                        size={18} 
                        color={theme.colors.primary} 
                      />
                    </View>
                    <Text style={styles.quickActionLabel}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Quick Actions Toggle Button (when hidden) */}
        {!showQuickActions && chatMessages.length > 1 && (
          <TouchableOpacity 
            style={styles.quickActionsToggle}
            onPress={toggleQuickActions}
          >
            <MaterialIcons name="lightbulb-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.quickActionsToggleText}>Show Quick Actions</Text>
          </TouchableOpacity>
        )}

        {/* Chat Messages */}
        <ScrollView
          ref={chatScrollRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {chatMessages.map(renderMessage)}
          
          {sendingMessage && (
            <View style={styles.typingIndicator}>
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.typingText}>AI is typing...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor={theme.colors.textTertiary}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={500}
                editable={!sendingMessage}
                onSubmitEditing={() => {
                  if (messageText.trim() && !sendingMessage) {
                    handleSendMessage();
                  }
                }}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || sendingMessage) && styles.sendButtonDisabled
              ]}
              onPress={() => handleSendMessage()}
              disabled={!messageText.trim() || sendingMessage}
            >
              {sendingMessage ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <MaterialIcons name="send" size={22} color={theme.colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  aiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionsContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  quickActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  quickActionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  quickActionsToggleText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  locationLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  locationLoadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  quickActionsScroll: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 140,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: theme.spacing.lg,
    paddingBottom: 280,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: 18,
  },
  userMessageBubble: {
    backgroundColor: theme.colors.accent,
    borderBottomRightRadius: 4,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  aiMessageBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  errorMessageBubble: {
    backgroundColor: theme.colors.errorLight,
    borderColor: theme.colors.error,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: theme.colors.white,
  },
  aiMessageText: {
    color: theme.colors.textPrimary,
  },
  messageTime: {
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing.xs,
  },
  userMessageTime: {
    color: theme.colors.white,
    opacity: 0.7,
    textAlign: 'right',
  },
  aiMessageTime: {
    color: theme.colors.textSecondary,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  typingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 90,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    zIndex: 1000,
    elevation: 10,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },

  inputWrapper: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 24,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    maxHeight: 100,
    minHeight: 32,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.surfaceLight,
    opacity: 0.6,
  },
});
