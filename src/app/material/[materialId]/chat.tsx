import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { materialChatService } from '@/chat/material-chat-service';
import { SourcePreviewSheet } from '@/components/foundation/source-preview-sheet';
import { StatusBadge } from '@/components/foundation/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { ChatRepository } from '@/db/repositories/chat-repository';
import { MaterialRepository } from '@/db/repositories/material-repository';
import type { ChatMessage, StoredCitation } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { userFacingError } from '@/utils/user-facing-error';

const suggestions = [
  'Explain this simply',
  'Give me an example',
  'Summarize the key points',
  'What should I understand first?',
  'Compare these concepts',
  'Quiz me on this topic',
];

export default function MaterialChatScreen() {
  const { materialId, topicTitle, prompt } = useLocalSearchParams<{
    materialId: string;
    topicTitle?: string;
    prompt?: string;
  }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const interruptedRef = useRef(false);
  const seededPrompt = useRef(false);
  const [materialTitle, setMaterialTitle] = useState('This material');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<StoredCitation | null>(null);

  const load = useCallback(async () => {
    const [nextMessages, material] = await Promise.all([
      materialChatService.load(db, materialId),
      new MaterialRepository(db).getById(materialId),
    ]);
    setMessages(nextMessages);
    if (material) setMaterialTitle(material.title);
  }, [db, materialId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    if (!seededPrompt.current && prompt) {
      seededPrompt.current = true;
      setQuestion(prompt);
    }
  }, [prompt]);

  const ask = async (suggested?: string) => {
    const currentQuestion = (suggested ?? question).trim();
    if (currentQuestion.length < 3 || isGenerating) return;
    setQuestion('');
    setError(null);
    setIsGenerating(true);
    interruptedRef.current = false;

    const now = new Date().toISOString();
    const optimisticUser: ChatMessage = {
      id: `optimistic-user-${now}`,
      threadId: 'optimistic',
      role: 'user',
      content: currentQuestion,
      citations: [],
      status: 'complete',
      createdAt: now,
    };
    const optimisticAssistant: ChatMessage = {
      id: `optimistic-assistant-${now}`,
      threadId: 'optimistic',
      role: 'assistant',
      content: '',
      citations: [],
      status: 'pending',
      createdAt: now,
    };
    setMessages((current) => [...current, optimisticUser, optimisticAssistant]);

    try {
      await materialChatService.ask(db, materialId, currentQuestion, {
        wasInterrupted: () => interruptedRef.current,
        onToken: (content) =>
          setMessages((current) =>
            current.map((message) =>
              message.id === optimisticAssistant.id ? { ...message, content } : message
            )
          ),
      });
    } catch (caught) {
      if (!interruptedRef.current) {
        setError(userFacingError(caught, 'The offline answer could not be completed. Retry when you are ready.'));
      }
    } finally {
      setIsGenerating(false);
      await load();
    }
  };

  const stop = () => {
    interruptedRef.current = true;
    materialChatService.stop();
  };

  const clearConversation = () => {
    Alert.alert(
      'Clear this conversation?',
      'This permanently deletes every question and answer for this material. The material and study progress remain.',
      [
        { text: 'Keep conversation', style: 'cancel' },
        {
          text: 'Clear conversation',
          style: 'destructive',
          onPress: () => {
            void new ChatRepository(db).clearForMaterial(materialId).then(load);
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
        style={styles.container}>
        <View style={[styles.header, { borderBottomColor: theme.divider }]}>
          <View style={styles.flex}>
            <ThemedText type="subtitle" numberOfLines={1}>Chat with {materialTitle}</ThemedText>
            <View style={styles.contextRow}>
              <StatusBadge label="Ready offline" tone="offline" />
              {topicTitle ? (
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                  Topic: {topicTitle}
                </ThemedText>
              ) : null}
            </View>
          </View>
          {messages.length > 0 ? (
            <Pressable
              accessibilityLabel="Clear conversation"
              accessibilityRole="button"
              onPress={clearConversation}
              style={[styles.headerAction, { borderColor: theme.border }]}>
              <Ionicons name="trash-outline" color={theme.textSecondary} size={20} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}>
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name="chatbubble-ellipses-outline" color={theme.primary} size={30} />
              </View>
              <ThemedText type="heading">Ask a focused question</ThemedText>
              <ThemedText themeColor="textSecondary">
                Soma answers only from this material and shows the passages that support the answer.
              </ThemedText>
              <View style={styles.suggestions}>
                {suggestions.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    accessibilityRole="button"
                    onPress={() => void ask(topicTitle ? `${suggestion} about ${topicTitle}.` : suggestion)}
                    style={[styles.suggestion, { borderColor: theme.border }]}>
                    <ThemedText type="smallBold">{suggestion}</ThemedText>
                    <Ionicons name="arrow-forward" color={theme.primary} size={17} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.messages}>
            {messages.map((message) => {
              const isUser = message.role === 'user';
              const unavailable =
                message.role === 'assistant' &&
                (message.content.includes('can’t answer that from this material') ||
                  message.content.includes('couldn’t find enough information'));
              return (
                <View
                  key={message.id}
                  style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
                  <View
                    style={[
                      styles.messageBubble,
                      {
                        backgroundColor: isUser
                          ? theme.primary
                          : unavailable
                            ? theme.warningSoft
                            : theme.surface,
                        borderColor: isUser ? theme.primary : theme.border,
                      },
                    ]}>
                    {!message.content ? (
                      <View
                        accessibilityLiveRegion="polite"
                        accessibilityLabel="Finding the most relevant passages"
                        style={styles.typing}>
                        <ActivityIndicator color={theme.primary} size="small" />
                        <View style={styles.flex}>
                          <ThemedText type="smallBold">Finding relevant passages</ThemedText>
                          <ThemedText type="caption" themeColor="textSecondary">
                            A local response can take a little longer.
                          </ThemedText>
                        </View>
                      </View>
                    ) : (
                      <ThemedText selectable style={isUser ? styles.userText : undefined}>
                        {message.content}
                      </ThemedText>
                    )}
                    {message.status === 'interrupted' ? (
                      <ThemedText type="caption" themeColor="textSecondary">
                        Response stopped. The partial answer is saved.
                      </ThemedText>
                    ) : null}
                    {message.status === 'failed' ? (
                      <ThemedText type="caption" style={{ color: theme.danger }}>
                        The answer was interrupted. Ask again when the offline AI is ready.
                      </ThemedText>
                    ) : null}
                  </View>
                  {message.citations.length > 0 ? (
                    <View style={styles.citations}>
                      <ThemedText type="caption" themeColor="textSecondary">Supporting sources</ThemedText>
                      <View style={styles.citationRow}>
                        {message.citations.map((citation) => (
                          <Pressable
                            key={`${message.id}-${citation.chunkId}`}
                            accessibilityHint="Opens the supporting passage"
                            accessibilityRole="button"
                            onPress={() => setSelectedCitation(citation)}
                            style={[styles.citation, { backgroundColor: theme.backgroundElement }]}>
                            <Ionicons name="document-text-outline" color={theme.primary} size={15} />
                            <ThemedText type="caption" numberOfLines={1}>{citation.label}</ThemedText>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          {error ? (
            <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
              <ThemedText type="smallBold" style={{ color: theme.danger }}>Answer needs attention</ThemedText>
              <ThemedText type="small" style={{ color: theme.danger }}>
                {error} Your question is still saved.
              </ThemedText>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.composer, { backgroundColor: theme.surface, borderTopColor: theme.divider }]}>
          <TextInput
            accessibilityLabel={`Ask ${materialTitle}`}
            editable={!isGenerating}
            multiline
            onChangeText={setQuestion}
            placeholder={topicTitle ? `Ask about ${topicTitle}…` : 'Ask about this material…'}
            placeholderTextColor={theme.textTertiary}
            style={[
              styles.input,
              { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
            ]}
            value={question}
          />
          <Pressable
            accessibilityLabel={isGenerating ? 'Stop response' : 'Send question'}
            accessibilityRole="button"
            accessibilityState={{ disabled: !isGenerating && question.trim().length < 3 }}
            disabled={!isGenerating && question.trim().length < 3}
            onPress={isGenerating ? stop : () => void ask()}
            style={[
              styles.sendButton,
              { backgroundColor: isGenerating ? theme.danger : theme.primary },
              !isGenerating && question.trim().length < 3 && styles.disabled,
            ]}>
            <Ionicons name={isGenerating ? 'stop' : 'arrow-up'} color="#FFFFFF" size={22} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <SourcePreviewSheet
        citation={selectedCitation}
        materialTitle={materialTitle}
        onClose={() => setSelectedCitation(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  flex: { flex: 1 },
  contextRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  headerAction: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    borderWidth: 1,
    height: TouchTarget,
    justifyContent: 'center',
    width: TouchTarget,
  },
  content: { flexGrow: 1, gap: Spacing.four, paddingBottom: Spacing.four },
  empty: { gap: Spacing.three, padding: Spacing.four },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: Radius.large,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  suggestions: { gap: Spacing.two },
  suggestion: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: TouchTarget,
    paddingVertical: Spacing.two,
  },
  messages: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  messageRow: { gap: Spacing.two, maxWidth: '94%' },
  userRow: { alignSelf: 'flex-end', maxWidth: '82%' },
  assistantRow: { alignSelf: 'flex-start' },
  messageBubble: {
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  userText: { color: '#FFFFFF' },
  typing: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two, minWidth: 250 },
  citations: { gap: Spacing.one },
  citationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  citation: {
    alignItems: 'center',
    borderRadius: Radius.small,
    flexDirection: 'row',
    gap: Spacing.one,
    maxWidth: 260,
    minHeight: 40,
    paddingHorizontal: Spacing.two,
  },
  error: { gap: Spacing.one, marginHorizontal: Spacing.three, padding: Spacing.three },
  composer: {
    alignItems: 'flex-end',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  input: {
    borderRadius: Radius.large,
    borderWidth: 1,
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    textAlignVertical: 'top',
  },
  sendButton: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  disabled: { opacity: 0.38 },
});
