import type { SQLiteDatabase } from 'expo-sqlite';

import { generationRuntime } from '@/ai/generation-runtime';
import { ChatRepository } from '@/db/repositories/chat-repository';
import {
  buildNextMessages,
  shouldRefuseQuestion,
} from '@/chat/grounding-policy';
import { citationsMentionedInAnswer } from '@/learning/citations';
import {
  buildGroundedContext,
} from '@/retrieval/context-builder';

const REFUSAL =
  'I can’t answer that from this material. Try asking about a topic covered in the imported source.';

type AskOptions = {
  onToken?: (content: string) => void;
  wasInterrupted?: () => boolean;
};

class MaterialChatService {
  async load(db: SQLiteDatabase, materialId: string) {
    const repository = new ChatRepository(db);
    const thread = await repository.getOrCreateThread(materialId);
    return repository.listMessages(thread.id);
  }

  async ask(
    db: SQLiteDatabase,
    materialId: string,
    rawQuestion: string,
    options: AskOptions = {}
  ) {
    const question = rawQuestion.trim();
    if (question.length < 3) {
      throw new Error('Ask a complete question about this material.');
    }

    const repository = new ChatRepository(db);
    const thread = await repository.getOrCreateThread(materialId);
    const priorMessages = await repository.listMessages(thread.id, 4);

    await repository.createMessage({
      threadId: thread.id,
      role: 'user',
      content: question,
      status: 'complete',
    });
    const assistant = await repository.createMessage({
      threadId: thread.id,
      role: 'assistant',
      content: '',
      status: 'pending',
    });

    try {
      const grounded = await buildGroundedContext(materialId, question, {
        maxPassages: 4,
        maxContextCharacters: 4_200,
        minSimilarity: 0.2,
      });

      if (shouldRefuseQuestion(question, grounded.passages)) {
        await repository.updateMessage(assistant.id, REFUSAL, 'complete');
        options.onToken?.(REFUSAL);
        return repository.listMessages(thread.id);
      }

      const nextMessages = buildNextMessages(
        priorMessages,
        question,
        grounded.context
      );
      let streamed = '';
      const finalOutput = await generationRuntime.generate(
        nextMessages,
        (token) => {
          streamed += token;
          options.onToken?.(streamed);
        }
      );
      const rawAnswer = finalOutput.trim() || streamed.trim();
      const unsupported = rawAnswer.toUpperCase().startsWith('UNSUPPORTED');
      const answer = unsupported ? REFUSAL : rawAnswer;
      const citations = unsupported
        ? []
        : citationsMentionedInAnswer(answer, grounded.passages);

      await repository.updateMessage(
        assistant.id,
        answer,
        'complete',
        citations
      );
      options.onToken?.(answer);
    } catch (error) {
      const interrupted = options.wasInterrupted?.() ?? false;
      const content = interrupted
        ? 'Generation stopped. Your question is saved, so you can try again.'
        : 'I could not finish the local answer. Your question was saved—please retry.';
      await repository.updateMessage(
        assistant.id,
        content,
        interrupted ? 'interrupted' : 'failed'
      );
      throw error;
    }

    return repository.listMessages(thread.id);
  }

  stop() {
    generationRuntime.interrupt();
  }
}

export const materialChatService = new MaterialChatService();
