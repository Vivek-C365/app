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
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import LoadingSpinner from '../components/LoadingSpinner';
import aiService from '../services/aiService';
import caseService from '../services/caseService';
import toast from '../utils/toast';

export default function AIEmergencyScreen({ route, navigation }) {
  const { caseId } = route.params;
  const insets = useSafeAreaInsets();
  const chatScrollRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

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
        
        // Activate AI emergency assistance (non-blocking, optional)
        try {
          await aiService.activateEmergencyAssistance(caseId);
        } catch (error) {
          console.warn('AI activation failed, continuing anyway:', error);
        }
        
        // Create detailed case summary for AI
        const caseSummary = `
**Case Details:**
- Animal Type: ${caseResponse.case.animalType || 'Unknown'}
- Condition: ${caseResponse.case.description || 'Not specified'}
- Location: ${caseResponse.case.location?.address || caseResponse.case.location?.landmarks || 'Unknown location'}
- Urgency: ${caseResponse.case.urgencyLevel || 'Medium'}
- Status: ${caseResponse.case.status || 'Open'}
${caseResponse.case.photos && caseResponse.case.photos.length > 0 ? `- Photos: ${caseResponse.case.photos.length} attached` : ''}
        `.trim();
        
        // Add welcome message with case context
        setChatMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I'm your AI assistant for this animal rescue case. I have reviewed the case details and I'm here to help you with:

${caseSummary}

I can provide:
• Emergency first aid guidance
• Nearby facility recommendations
• Transportation advice
• Condition assessment
• Step-by-step instructions

What would you like help with?`,
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
      // Include case context in the message
      const caseContext = {
        caseId: caseId,
        animalType: caseData?.animalType,
        condition: caseData?.description,
        urgencyLevel: caseData?.urgencyLevel,
        location: caseData?.location,
        photos: caseData?.photos,
      };

      const response = await aiService.sendAIChatMessage({
        message: userMessage.content,
        conversationHistory: chatMessages.slice(-10), // Last 10 messages for context
        caseContext: caseContext, // Include case details
      });

      if (response.success && response.message) {
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString(),
        };
        setChatMessages(prev => [...prev, assistantMessage]);
        
        // Scroll to bottom
        setTimeout(() => {
          chatScrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        // Provide helpful fallback response
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I apologize, but the AI service is currently unavailable. Based on the case details, I recommend contacting nearby animal hospitals or rescue organizations immediately for professional help.',
          timestamp: new Date().toISOString(),
        };
        setChatMessages(prev => [...prev, assistantMessage]);
        
        setTimeout(() => {
          chatScrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Send chat message error:', error);
      // Provide helpful fallback response
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but the AI service is currently unavailable. Based on the case details, I recommend contacting nearby animal hospitals or rescue organizations immediately for professional help.',
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, assistantMessage]);
      
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } finally {
      setSendingMessage(false);
    }
  };

  const renderChat = () => (
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
  );

  const renderInput = () => (
    <View style={styles.chatInputContainer}>
      <TextInput
        style={styles.chatInput}
        value={messageText}
        onChangeText={setMessageText}
        placeholder="Ask for help..."
        placeholderTextColor={theme.colors.textTertiary}
        multiline
        maxLength={500}
        editable={!sendingMessage}
      />
      <TouchableOpacity
        style={[styles.sendButton, (!messageText.trim() || sendingMessage) && styles.sendButtonDisabled]}
        onPress={sendChatMessage}
        disabled={!messageText.trim() || sendingMessage}
      >
        {sendingMessage ? (
          <ActivityIndicator size="small" color={theme.colors.white} />
        ) : (
          <MaterialIcons 
            name="send" 
            size={20} 
            color={messageText.trim() ? theme.colors.white : theme.colors.textTertiary} 
          />
        )}
      </TouchableOpacity>
    </View>
  );



  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AI Help</Text>
          <Text style={styles.headerSubtitle}>
            {caseData?.animalType ? `${caseData.animalType} • ` : ''}Case #{caseData?.id?.slice(0, 8)}
          </Text>
        </View>
        <View style={styles.aiIndicator}>
          <MaterialIcons name="auto-awesome" size={20} color={theme.colors.primary} />
        </View>
      </View>

      {/* Chat Content */}
      {renderChat()}

      {/* Input - Positioned absolutely at bottom */}
      {renderInput()}
    </KeyboardAvoidingView>
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
  aiIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
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
  chatMessages: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: theme.spacing.md,
    paddingBottom: 180, // Space for input + tab bar
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: 110, // Space for tab bar
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
  chatInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 24,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
    maxHeight: 100,
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.accent,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.surfaceLight,
    opacity: 0.6,
  },
});
