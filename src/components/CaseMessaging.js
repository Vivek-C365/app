/**
 * @fileoverview Case Messaging Component
 * Real-time chat interface with message bubbles, read receipts, image sharing, and presence
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useMessaging } from '../contexts/MessagingContext';
import toast from '../utils/toast';

export default function CaseMessaging({ caseId, style }) {
  const { user } = useAuth();
  const { 
    subscribeToCase, 
    unsubscribeFromCase,
    subscribeToPresence,
    unsubscribeFromPresence,
    sendMessage,
    getMessages,
    uploadChatImage,
    onlineUsers,
  } = useMessaging();

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (!caseId) return;

    // Fetch initial messages
    fetchMessages();

    // Subscribe to real-time updates
    subscribeToCase(caseId, handleNewMessage);

    // Subscribe to presence
    if (user) {
      subscribeToPresence(caseId, {
        name: user.name,
        user_type: user.user_type,
      });
    }

    // Cleanup on unmount
    return () => {
      unsubscribeFromCase(caseId);
      unsubscribeFromPresence(caseId);
    };
  }, [caseId, user]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const result = await getMessages(caseId);
      if (result.success) {
        setMessages(result.messages || []);
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (message) => {
    setMessages(prev => {
      // Check if message already exists
      if (prev.some(m => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
    setTimeout(() => scrollToBottom(), 100);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    const content = messageText.trim();
    setMessageText('');

    try {
      setSending(true);
      const result = await sendMessage(caseId, {
        content,
        messageType: 'text',
        priority: 'normal',
      });

      if (!result.success) {
        toast.error('Failed to send', result.error || 'Please try again');
        setMessageText(content); // Restore message
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send', 'Please try again');
      setMessageText(content); // Restore message
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Permission denied', 'Please allow access to photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handleSendImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      toast.error('Failed to pick image', 'Please try again');
    }
  };

  const handleSendImage = async (imageUri) => {
    try {
      setUploadingImage(true);

      // Upload image
      const uploadResult = await uploadChatImage(imageUri, caseId);
      if (!uploadResult.success) {
        toast.error('Upload failed', uploadResult.error || 'Please try again');
        return;
      }

      // Send message with image URL
      const result = await sendMessage(caseId, {
        content: uploadResult.url,
        messageType: 'image',
        priority: 'normal',
      });

      if (!result.success) {
        toast.error('Failed to send', result.error || 'Please try again');
      }
    } catch (error) {
      console.error('Error sending image:', error);
      toast.error('Failed to send image', 'Please try again');
    } finally {
      setUploadingImage(false);
    }
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const isOwnMessage = (message) => {
    return message.sender_id === user?.id;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOnlineCount = () => {
    const users = onlineUsers[caseId] || [];
    return users.length;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Online Users Indicator */}
      {getOnlineCount() > 0 && (
        <View style={styles.onlineIndicator}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>
            {getOnlineCount()} {getOnlineCount() === 1 ? 'person' : 'people'} online
          </Text>
        </View>
      )}

      {/* Messages List */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="chat-bubble-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation</Text>
          </View>
        ) : (
          messages.map((message, index) => {
            const isOwn = isOwnMessage(message);
            const showSender = !isOwn && (index === 0 || messages[index - 1].sender_id !== message.sender_id);
            const isImage = message.message_type === 'image';
            const isSystem = message.message_type === 'system';

            if (isSystem) {
              return (
                <View key={message.id} style={styles.systemMessage}>
                  <Text style={styles.systemMessageText}>{message.content}</Text>
                  <Text style={styles.systemMessageTime}>{formatTime(message.timestamp)}</Text>
                </View>
              );
            }

            return (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
                ]}
              >
                {showSender && (
                  <Text style={styles.messageSender}>
                    {message.sender?.name || 'Unknown'}
                  </Text>
                )}
                
                {isImage ? (
                  <TouchableOpacity activeOpacity={0.9}>
                    <Image
                      source={{ uri: message.content }}
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
                    {message.content}
                  </Text>
                )}

                <View style={styles.messageFooter}>
                  <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>
                    {formatTime(message.timestamp)}
                  </Text>
                  
                  {isOwn && message.read_by && message.read_by.length > 1 && (
                    <MaterialIcons
                      name="done-all"
                      size={14}
                      color={isOwn ? 'rgba(255, 255, 255, 0.7)' : theme.colors.primary}
                      style={styles.readReceipt}
                    />
                  )}
                </View>
              </View>
            );
          })
        )}

        {uploadingImage && (
          <View style={[styles.messageBubble, styles.messageBubbleOwn]}>
            <ActivityIndicator size="small" color={theme.colors.white} />
            <Text style={[styles.messageText, styles.messageTextOwn]}>
              Uploading image...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.textTertiary}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={2000}
          editable={!sending}
        />

        <TouchableOpacity
          style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || sending}
        >
          {sending ? (
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  onlineText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: theme.spacing.lg,
    paddingBottom: 200,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 3,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
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
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: 4,
  },
  messageTime: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  messageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  readReceipt: {
    marginLeft: 2,
  },
  systemMessage: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
  },
  systemMessageText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  systemMessageTime: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: 110,
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
  input: {
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
