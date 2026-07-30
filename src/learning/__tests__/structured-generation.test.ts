import { z } from 'zod';

import type { AiOperationLease } from '@/ai/runtime-coordinator';
import {
  generateValidatedObject,
  hasCompleteJsonObject,
} from '@/learning/structured-generation';

const mockGenerate = jest.fn();
const mockInterrupt = jest.fn();
const mockFixAndValidate = jest.fn();

jest.mock('@/ai/generation-runtime', () => ({
  generationRuntime: {
    generate: (...args: unknown[]) => mockGenerate(...args),
    interrupt: () => mockInterrupt(),
  },
}));

jest.mock('react-native-executorch', () => ({
  fixAndValidateStructuredOutput: (...args: unknown[]) =>
    mockFixAndValidate(...args),
}));

const lease = {
  isActive: () => true,
  assertActive: () => undefined,
} as AiOperationLease;

describe('structured generation', () => {
  beforeEach(() => {
    mockGenerate.mockReset();
    mockInterrupt.mockReset();
    mockFixAndValidate.mockReset();
  });

  it('detects a complete object without treating braces inside strings as structure', () => {
    expect(hasCompleteJsonObject('{"value":"a } brace","items":[1,2]}')).toBe(
      true
    );
    expect(hasCompleteJsonObject('{"value":"unfinished"')).toBe(false);
  });

  it('stops after the first complete JSON object and performs only one inference', async () => {
    const output = '{"value":"grounded"}';
    mockGenerate.mockImplementation(
      async (
        _messages: unknown,
        _lease: unknown,
        onToken: (token: string) => void
      ) => {
        onToken('{"value":');
        onToken('"grounded"}');
        return output;
      }
    );

    await expect(
      generateValidatedObject(
        [{ role: 'user', content: 'Return JSON.' }],
        z.object({ value: z.string() }),
        'Repair value.',
        lease
      )
    ).resolves.toEqual({ value: 'grounded' });

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockInterrupt).toHaveBeenCalledTimes(1);
    expect(mockFixAndValidate).not.toHaveBeenCalled();
  });

  it('repairs malformed JSON locally instead of starting another inference', async () => {
    mockGenerate.mockResolvedValue('{"value":"grounded",}');
    mockFixAndValidate.mockReturnValue({ value: 'grounded' });

    await expect(
      generateValidatedObject(
        [{ role: 'user', content: 'Return JSON.' }],
        z.object({ value: z.string() }),
        'Repair value.',
        lease
      )
    ).resolves.toEqual({ value: 'grounded' });

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockFixAndValidate).toHaveBeenCalledTimes(1);
  });
});
