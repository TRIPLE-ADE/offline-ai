import type { Message } from 'react-native-executorch';
import type { z } from 'zod';

import { generationRuntime } from '@/ai/generation-runtime';
import type { AiOperationLease } from '@/ai/runtime-coordinator';

export function extractJsonObject(text: string): unknown {
  const withoutFence = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('The local model did not return a JSON object.');
  }
  return JSON.parse(withoutFence.slice(start, end + 1)) as unknown;
}

export async function generateValidatedObject<T>(
  messages: Message[],
  schema: z.ZodType<T>,
  repairDescription: string,
  lease: AiOperationLease
): Promise<T> {
  const firstOutput = await generationRuntime.generate(messages, lease);
  const firstResult = parseWithSchema(firstOutput, schema);
  if (firstResult.success) {
    return firstResult.data;
  }

  const repairedOutput = await generationRuntime.generate(
    [
      {
        role: 'system',
        content:
          'Repair malformed JSON. Return one valid JSON object only, without markdown or commentary.',
      },
      {
        role: 'user',
        content: `${repairDescription}\n\nMalformed output:\n${firstOutput}`,
      },
    ],
    lease
  );
  const repairedResult = parseWithSchema(repairedOutput, schema);
  if (!repairedResult.success) {
    throw new Error(`The local model returned invalid structured output: ${repairedResult.error}`);
  }
  return repairedResult.data;
}

function parseWithSchema<T>(text: string, schema: z.ZodType<T>) {
  try {
    const parsed = extractJsonObject(text);
    const result = schema.safeParse(parsed);
    return result.success
      ? ({ success: true, data: result.data } as const)
      : ({ success: false, error: result.error.message } as const);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON.',
    } as const;
  }
}
