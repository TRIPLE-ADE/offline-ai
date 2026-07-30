import {
  fixAndValidateStructuredOutput,
  type Message,
} from 'react-native-executorch';
import type { z } from 'zod';

import { generationRuntime } from '@/ai/generation-runtime';
import type { AiOperationLease } from '@/ai/runtime-coordinator';

type StructuredGenerationOptions = {
  timeoutMs?: number;
  stallTimeoutMs?: number;
};

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

export function hasCompleteJsonObject(text: string) {
  const start = text.indexOf('{');
  if (start < 0) {
    return false;
  }

  let depth = 0;
  let insideString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const character = text[index];

    if (insideString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        insideString = false;
      }
      continue;
    }

    if (character === '"') {
      insideString = true;
    } else if (character === '{' || character === '[') {
      depth += 1;
    } else if (character === '}' || character === ']') {
      depth -= 1;
      if (depth === 0) {
        return true;
      }
      if (depth < 0) {
        return false;
      }
    }
  }

  return false;
}

export async function generateValidatedObject<T>(
  messages: Message[],
  schema: z.ZodType<T>,
  _repairDescription: string,
  lease: AiOperationLease,
  options: StructuredGenerationOptions = {}
): Promise<T> {
  let streamedOutput = '';
  let requestedEarlyStop = false;
  const output = await generationRuntime.generate(
    messages,
    lease,
    (token) => {
      streamedOutput += token;
      if (!requestedEarlyStop && hasCompleteJsonObject(streamedOutput)) {
        requestedEarlyStop = true;
        generationRuntime.interrupt();
      }
    },
    {
      timeoutMs: options.timeoutMs ?? 180_000,
      stallTimeoutMs: options.stallTimeoutMs ?? 90_000,
    }
  );
  const candidate = hasCompleteJsonObject(streamedOutput)
    ? streamedOutput
    : output;

  const parsed = parseWithSchema(candidate, schema);
  if (parsed.success) {
    return parsed.data;
  }

  try {
    // Repair punctuation and quoting locally. A malformed JSON response must
    // never trigger a second full model inference on a mobile device.
    return fixAndValidateStructuredOutput(candidate, schema) as T;
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : parsed.error;
    throw new Error(`The local model returned invalid structured output: ${reason}`);
  }
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
