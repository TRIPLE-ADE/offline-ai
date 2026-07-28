import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { materialChatService } from '@/chat/material-chat-service';
import { ChatComposer } from '@/components/foundation/chat-composer';
import { ChatMessage as ChatMessageBubble } from '@/components/foundation/chat-message';
import { SourcePreviewSheet } from '@/components/foundation/source-preview-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Elevation, MaxContentWidth, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { ChatRepository } from '@/db/repositories/chat-repository';
import { MaterialRepository } from '@/db/repositories/material-repository';
import type { ChatMessage, StoredCitation } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { userFacingError } from '@/utils/user-facing-error';

const suggestions = [
  {
    icon: 'sparkles-outline',
    title: 'Make it clear',
    prompt: 'Explain the main ideas in simple terms.',
  },
  {
    icon: 'compass-outline',
    title: 'Find my starting point',
    prompt: 'What should I understand first?',
  },
  {
    icon: 'git-compare-outline',
    title: 'Connect the concepts',
    prompt: 'Compare the key concepts and how they relate.',
  },
  {
    icon: 'checkmark-circle-outline',
    title: 'Test my recall',
    prompt: 'Quiz me on the most important points.',
  },
] as const;

const BOTTOM_THRESHOLD = 96;

export default function MaterialChatScreen() {
  const { materialId, topicTitle, prompt } = useLocalSearchParams<{
    materialId: string;
    topicTitle?: string;
    prompt?: string;
  }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const interruptedRef = useRef(false);
  const seededPrompt = useRef(false);
  const shouldAutoScrollRef = useRef(true);
  const shouldSnapOnNextLayoutRef = useRef(true);
  const [materialTitle, setMaterialTitle] = useState('This material');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<StoredCitation | null>(null);

  const scrollToLatest = useCallback((animated = true) => {
    shouldAutoScrollRef.current = true;
    setShowScrollButton(false);
    listRef.current?.scrollToEnd({ animated });
  }, []);

  const load = useCallback(async () => {
    const [nextMessages, material] = await Promise.all([
      materialChatService.load(db, materialId),
      new MaterialRepository(db).getById(materialId),
    ]);
    shouldAutoScrollRef.current = true;
    shouldSnapOnNextLayoutRef.current = true;
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

  const ask = useCallback(
    async (suggested?: string) => {
      const currentQuestion = (suggested ?? question).trim();
      if (currentQuestion.length < 3 || isGenerating) return;
      setQuestion('');
      setError(null);
      setIsGenerating(true);
      setShowScrollButton(false);
      shouldAutoScrollRef.current = true;
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
      requestAnimationFrame(() => scrollToLatest());

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
          setError(
            userFacingError(
              caught,
              'The offline answer could not be completed. Retry when you are ready.'
            )
          );
        }
      } finally {
        setIsGenerating(false);
        await load();
      }
    },
    [db, isGenerating, load, materialId, question, scrollToLatest]
  );

  const stop = useCallback(() => {
    interruptedRef.current = true;
    materialChatService.stop();
  }, []);

  const clearConversation = useCallback(() => {
    Alert.alert(
      'Clear this conversation?',
      'Every question and answer for this material will be permanently deleted. Your material and study progress will stay intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear conversation',
          style: 'destructive',
          onPress: () => {
            void new ChatRepository(db).clearForMaterial(materialId).then(load);
          },
        },
      ]
    );
  }, [db, load, materialId]);

  const openConversationOptions = useCallback(() => {
    Alert.alert('Conversation options', materialTitle, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear conversation',
        style: 'destructive',
        onPress: clearConversation,
      },
    ]);
  }, [clearConversation, materialTitle]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      const isNearBottom = distanceFromBottom < BOTTOM_THRESHOLD;
      shouldAutoScrollRef.current = isNearBottom;
      setShowScrollButton((current) => (current === !isNearBottom ? current : !isNearBottom));
    },
    []
  );

  const handleContentSizeChange = useCallback(() => {
    if (shouldAutoScrollRef.current) {
      listRef.current?.scrollToEnd({
        animated:
          messages.length > 0 &&
          !isGenerating &&
          !shouldSnapOnNextLayoutRef.current,
      });
      shouldSnapOnNextLayoutRef.current = false;
    }
  }, [isGenerating, messages.length]);

  const handleSuggestionPress = useCallback(
    (suggestion: string) => {
      const focusedSuggestion = topicTitle
        ? `${suggestion.replace(/\.$/, '')} Focus on ${topicTitle}.`
        : suggestion;
      void ask(focusedSuggestion);
    },
    [ask, topicTitle]
  );

  const renderMessage: ListRenderItem<ChatMessage> = useCallback(
    ({ item }) => (
      <ChatMessageBubble message={item} onCitationPress={setSelectedCitation} />
    ),
    []
  );

  const renderContextCard = () => (
    <View
      style={[
        styles.contextCard,
        { backgroundColor: theme.surfaceTint, borderColor: theme.border },
      ]}>
      <View style={[styles.contextIcon, { backgroundColor: theme.secondarySoft }]}>
        <Ionicons name="shield-checkmark-outline" color={theme.secondary} size={18} />
      </View>
      <View style={styles.flex}>
        <ThemedText type="smallBold">Private, source-grounded answers</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {topicTitle ? `Focused on ${topicTitle}` : 'Soma uses only this material'}
        </ThemedText>
      </View>
      <View style={styles.offlineStatus}>
        <View style={[styles.offlineDot, { backgroundColor: theme.secondary }]} />
        <ThemedText type="caption" style={{ color: theme.secondary }}>
          Offline
        </ThemedText>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.empty}>
      <View style={styles.emptyIntro}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="book-outline" color={theme.primary} size={27} />
          <View style={[styles.sparkle, { backgroundColor: theme.accentSoft }]}>
            <Ionicons name="sparkles" color={theme.accent} size={13} />
          </View>
        </View>
        <ThemedText type="subtitle" style={styles.centerText}>
          Ask your material, not the internet
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.emptyDescription}>
          Get clear explanations, compare ideas, or check your understanding. Every answer stays
          grounded in your saved material.
        </ThemedText>
      </View>

      <View style={styles.suggestionSection}>
        <ThemedText type="smallBold">Try asking</ThemedText>
        <ScrollView
          horizontal
          contentContainerStyle={styles.suggestionRow}
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.title}
              accessibilityHint={`Asks: ${suggestion.prompt}`}
              accessibilityRole="button"
              onPress={() => handleSuggestionPress(suggestion.prompt)}
              style={({ pressed }) => [
                styles.suggestion,
                {
                  backgroundColor: pressed ? theme.surfaceSelected : theme.surfaceElevated,
                  borderColor: pressed ? theme.primary : theme.border,
                  opacity: pressed ? 0.86 : 1,
                },
              ]}>
              <View style={styles.suggestionTop}>
                <View style={[styles.suggestionIcon, { backgroundColor: theme.primarySoft }]}>
                  <Ionicons name={suggestion.icon} color={theme.primary} size={17} />
                </View>
                <Ionicons name="arrow-forward" color={theme.textMuted} size={15} />
              </View>
              <ThemedText type="smallBold">{suggestion.title}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={3}>
                {suggestion.prompt}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderError = () =>
    error ? (
      <View style={[styles.error, { backgroundColor: theme.errorSoft }]}>
        <Ionicons name="alert-circle-outline" color={theme.error} size={20} />
        <View style={styles.flex}>
          <ThemedText type="smallBold" style={{ color: theme.error }}>
            This answer needs attention
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.error }}>
            {error} Your question is still saved.
          </ThemedText>
        </View>
        <Pressable
          accessibilityLabel="Dismiss error"
          hitSlop={8}
          onPress={() => setError(null)}
          style={styles.dismissError}>
          <Ionicons name="close" color={theme.error} size={19} />
        </Pressable>
      </View>
    ) : null;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: materialTitle,
          headerRight:
            messages.length > 0 && !isGenerating
              ? () => (
                  <Pressable
                    accessibilityLabel="Conversation options"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={openConversationOptions}
                    style={({ pressed }) => [
                      styles.headerAction,
                      { backgroundColor: pressed ? theme.surfaceSelected : 'transparent' },
                    ]}>
                    <Ionicons
                      name="ellipsis-horizontal"
                      color={theme.textPrimary}
                      size={22}
                    />
                  </Pressable>
                )
              : undefined,
        }}
      />
      <KeyboardAvoidingView
        automaticOffset
        behavior="padding"
        style={styles.container}>
        <View style={styles.listLayer}>
          <FlatList
            ref={listRef}
            contentContainerStyle={[
              styles.content,
              messages.length === 0 && styles.emptyContent,
            ]}
            contentInsetAdjustmentBehavior="automatic"
            data={messages}
            initialNumToRender={16}
            ItemSeparatorComponent={() => <View style={styles.messageSeparator} />}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderEmptyState}
            ListFooterComponent={renderError}
            ListHeaderComponent={renderContextCard}
            maxToRenderPerBatch={12}
            onContentSizeChange={handleContentSizeChange}
            onScroll={handleScroll}
            renderItem={renderMessage}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            style={styles.list}
            windowSize={7}
          />

          {showScrollButton ? (
            <Pressable
              accessibilityLabel="Jump to latest answer"
              accessibilityRole="button"
              onPress={() => scrollToLatest()}
              style={({ pressed }) => [
                styles.scrollButton,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.border,
                  shadowColor: theme.shadow,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}>
              <Ionicons name="arrow-down" color={theme.primary} size={20} />
            </Pressable>
          ) : null}
        </View>

        <ChatComposer
          isGenerating={isGenerating}
          materialTitle={materialTitle}
          onChangeText={setQuestion}
          onSend={() => void ask()}
          onStop={stop}
          topicTitle={topicTitle}
          value={question}
        />
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
  listLayer: { flex: 1 },
  list: { flex: 1 },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    maxWidth: MaxContentWidth,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    width: '100%',
  },
  emptyContent: { paddingBottom: Spacing.three },
  flex: { flex: 1 },
  contextCard: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.four,
    minHeight: 60,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  contextIcon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.small,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  offlineStatus: { alignItems: 'center', flexDirection: 'row', gap: Spacing.one },
  offlineDot: { borderRadius: Radius.full, height: 7, width: 7 },
  empty: { flex: 1, gap: Spacing.five, justifyContent: 'center', paddingBottom: Spacing.four },
  emptyIntro: { alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three },
  emptyIcon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.large,
    height: 64,
    justifyContent: 'center',
    position: 'relative',
    width: 64,
  },
  sparkle: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.full,
    bottom: -3,
    height: 26,
    justifyContent: 'center',
    position: 'absolute',
    right: -5,
    width: 26,
  },
  centerText: { textAlign: 'center' },
  emptyDescription: { maxWidth: 410, textAlign: 'center' },
  suggestionSection: { gap: Spacing.two },
  suggestionRow: { gap: Spacing.two, paddingRight: Spacing.three },
  suggestion: {
    borderCurve: 'continuous',
    borderRadius: Radius.medium,
    borderWidth: 1,
    gap: Spacing.oneHalf,
    minHeight: 128,
    padding: Spacing.three,
    width: 184,
  },
  suggestionTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  suggestionIcon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.small,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  messageSeparator: { height: Spacing.four },
  error: {
    borderCurve: 'continuous',
    borderRadius: Radius.medium,
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
    padding: Spacing.three,
  },
  dismissError: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  scrollButton: {
    ...Elevation.floating,
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.full,
    borderWidth: 1,
    bottom: Spacing.three,
    height: TouchTarget,
    justifyContent: 'center',
    position: 'absolute',
    right: Spacing.three,
    width: TouchTarget,
  },
  headerAction: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
