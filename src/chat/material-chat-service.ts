import type { SQLiteDatabase } from 'expo-sqlite';

import { generationRuntime } from '@/ai/generation-runtime';
import {
  isAiOperationCancelledError,
  runtimeCoordinator,
} from '@/ai/runtime-coordinator';
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
  'I couldn’t find enough information in this material to answer that confidently. Try asking about a topic covered in the imported source.';

type AskOptions = {
  onToken?: (content: string) => void;
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

    return runtimeCoordinator.run(
      {
        kind: 'chatting',
        owner: { type: 'material-chat', id: materialId },
        interrupt: () => generationRuntime.interrupt(),
      },
      async (lease) => {
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
          const grounded = await buildGroundedContext(
            materialId,
            question,
            lease,
            {
              maxPassages: 4,
              maxContextCharacters: 4_200,
              minSimilarity: 0.2,
            }
          );

          if (shouldRefuseQuestion(question, grounded.passages)) {
            lease.assertActive();
            await repository.updateMessage(
              assistant.id,
              REFUSAL,
              'complete'
            );
            if (lease.isActive()) {
              options.onToken?.(REFUSAL);
            }
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
            lease,
            (token) => {
              streamed += token;
              options.onToken?.(streamed);
            }
          );
          const rawAnswer = finalOutput.trim() || streamed.trim();
          const unsupported = rawAnswer
            .toUpperCase()
            .startsWith('UNSUPPORTED');
          const answer = unsupported ? REFUSAL : rawAnswer;
          const citations = unsupported
            ? []
            : citationsMentionedInAnswer(answer, grounded.passages);

          lease.assertActive();
          await repository.updateMessage(
            assistant.id,
            answer,
            'complete',
            citations
          );
          if (lease.isActive()) {
            options.onToken?.(answer);
          }
        } catch (error) {
          const interrupted =
            lease.cancellationRequested ||
            isAiOperationCancelledError(error);
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
    );
  }

  stop(materialId: string) {
    return runtimeCoordinator.cancel('chatting', {
      type: 'material-chat',
      id: materialId,
    });
  }
}

export const materialChatService = new MaterialChatService();
