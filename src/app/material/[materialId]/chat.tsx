import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { materialChatService } from '@/chat/material-chat-service';
import { ScreenHeader } from '@/components/foundation/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { ChatMessage } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { useRuntimeStore } from '@/stores/runtime-store';

export default function MaterialChatScreen() {
  const { materialId } = useLocalSearchParams<{ materialId: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const generation = useRuntimeStore((state) => state.generation);
  const scrollRef = useRef<ScrollView>(null);
  const interruptedRef = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);

  const load = useCallback(async () => {
    setMessages(await materialChatService.load(db, materialId));
  }, [db, materialId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleAsk = async () => {
    const currentQuestion = question.trim();
    if (currentQuestion.length < 3 || isGenerating) {
      return;
    }

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
    setMessages((current) => [
      ...current,
      optimisticUser,
      optimisticAssistant,
    ]);

    try {
      await materialChatService.ask(db, materialId, currentQuestion, {
        wasInterrupted: () => interruptedRef.current,
        onToken: (content) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === optimisticAssistant.id
                ? { ...message, content }
                : message
            )
          );
        },
      });
    } catch (caught) {
      if (!interruptedRef.current) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to finish this local answer.'
        );
      }
    } finally {
      setIsGenerating(false);
      await load();
    }
  };

  const handleStop = () => {
    interruptedRef.current = true;
    materialChatService.stop();
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={96}
        style={styles.container}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
          showsVerticalScrollIndicator={false}>
          <ScreenHeader
            eyebrow="Material-only assistant"
            title="Ask this material"
            subtitle="Each question retrieves fresh local evidence. The assistant refuses when the imported source does not support an answer."
          />

          {messages.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <Ionicons name="chatbubbles-outline" color="#4A50CE" size={34} />
              <ThemedText type="subtitle" style={styles.compactTitle}>
                Resolve a point of confusion
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Ask about a definition, distinction, example, or relationship covered
                by this material. Answers include inspectable source excerpts.
              </ThemedText>
              <View style={styles.examples}>
                <ThemedText type="smallBold">Try asking</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  “Explain the main idea in simple terms.”
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  “What is the difference between the first two concepts?”
                </ThemedText>
              </View>
            </ThemedView>
          ) : null}

          <View style={styles.messages}>
            {messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <View
                  key={message.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.userRow : styles.assistantRow,
                  ]}>
                  <View
                    style={[
                      styles.messageBubble,
                      {
                        backgroundColor: isUser
                          ? '#4A50CE'
                          : theme.backgroundElement,
                      },
                    ]}>
                    {message.content ? (
                      <ThemedText
                        style={isUser ? styles.userText : undefined}>
                        {message.content}
                      </ThemedText>
                    ) : (
                      <View style={styles.typing}>
                        <ActivityIndicator color="#4A50CE" size="small" />
                        <ThemedText type="small" themeColor="textSecondary">
                          Reading the most relevant passages…
                        </ThemedText>
                      </View>
                    )}
                    {message.status === 'failed' ||
                    message.status === 'interrupted' ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {message.status === 'interrupted'
                          ? 'Stopped'
                          : 'Generation failed'}
                      </ThemedText>
                    ) : null}
                  </View>

                  {message.citations.length > 0 ? (
                    <View style={styles.citations}>
                      {message.citations.map((citation) => (
                        <View key={`${message.id}-${citation.chunkId}`}>
                          <Pressable
                            onPress={() =>
                              setExpandedCitation((current) =>
                                current === `${message.id}-${citation.chunkId}`
                                  ? null
                                  : `${message.id}-${citation.chunkId}`
                              )
                            }
                            style={[
                              styles.chip,
                              { backgroundColor: theme.backgroundSelected },
                            ]}>
                            <Ionicons
                              name="document-text-outline"
                              color={theme.text}
                              size={15}
                            />
                            <ThemedText type="smallBold">
                              {citation.label}
                            </ThemedText>
                          </Pressable>
                          {expandedCitation ===
                          `${message.id}-${citation.chunkId}` ? (
                            <ThemedView
                              type="backgroundElement"
                              style={styles.sourceCard}>
                              <ThemedText type="small" themeColor="textSecondary">
                                {citation.excerpt}
                              </ThemedText>
                            </ThemedView>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          {error ? (
            <ThemedView type="backgroundElement" style={styles.errorCard}>
              <ThemedText type="smallBold">Answer unavailable</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {error} Your question remains in the conversation.
              </ThemedText>
            </ThemedView>
          ) : null}
        </ScrollView>

        <ThemedView
          type="backgroundElement"
          style={[
            styles.composer,
            { borderTopColor: theme.backgroundSelected },
          ]}>
          <TextInput
            accessibilityLabel="Ask this material"
            editable={!isGenerating}
            multiline
            onChangeText={setQuestion}
            onSubmitEditing={() => void handleAsk()}
            placeholder="Ask a question grounded in this material…"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                borderColor: theme.backgroundSelected,
                color: theme.text,
              },
            ]}
            value={question}
          />
          {isGenerating ? (
            <Pressable
              accessibilityLabel="Stop generation"
              onPress={handleStop}
              style={styles.sendButton}>
              <Ionicons name="stop" color="#FFFFFF" size={22} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityLabel="Send question"
              disabled={question.trim().length < 3}
              onPress={() => void handleAsk()}
              style={[
                styles.sendButton,
                question.trim().length < 3 && styles.disabled,
              ]}>
              <Ionicons name="arrow-up" color="#FFFFFF" size={22} />
            </Pressable>
          )}
        </ThemedView>

        {isGenerating && generation.phase === 'downloading' ? (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.downloadStatus}>
            Downloading Gemma · {Math.round(generation.progress * 100)}%
          </ThemedText>
        ) : null}
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  emptyCard: {
    borderRadius: 22,
    gap: Spacing.three,
    marginHorizontal: Spacing.four,
    padding: Spacing.four,
  },
  compactTitle: { fontSize: 24, lineHeight: 30 },
  examples: { gap: Spacing.one },
  messages: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  messageRow: { gap: Spacing.two, maxWidth: '92%' },
  userRow: { alignSelf: 'flex-end' },
  assistantRow: { alignSelf: 'flex-start' },
  messageBubble: {
    borderRadius: 18,
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  userText: { color: '#FFFFFF' },
  typing: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  citations: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 99,
    flexDirection: 'row',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  sourceCard: {
    borderRadius: 14,
    marginTop: Spacing.one,
    maxWidth: 360,
    padding: Spacing.two,
  },
  errorCard: {
    borderRadius: 16,
    gap: Spacing.one,
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
  },
  composer: {
    alignItems: 'flex-end',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    textAlignVertical: 'top',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#4A50CE',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  disabled: { opacity: 0.4 },
  downloadStatus: {
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
});
