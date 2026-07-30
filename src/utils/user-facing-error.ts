import {
  isAiOperationBusyError,
  isAiOperationCancelledError,
} from '@/ai/runtime-coordinator';

export function userFacingError(error: unknown, fallback: string) {
  if (isAiOperationBusyError(error)) {
    return 'Another offline AI task is already running. Finish or stop it, then try again.';
  }
  if (isAiOperationCancelledError(error)) {
    return 'The offline AI task was stopped.';
  }

  const message = error instanceof Error ? error.message : '';
  const normalized = message.toLowerCase();

  if (normalized.includes('selectable text') || normalized.includes('no text')) {
    return 'This PDF does not appear to contain enough selectable text. Try a digital PDF or a TXT version.';
  }
  if (normalized.includes('password') || normalized.includes('encrypted')) {
    return 'This PDF is password-protected. Remove the password before importing it.';
  }
  if (normalized.includes('storage') || normalized.includes('disk')) {
    return 'There is not enough free storage to complete this step. Free some space, then retry.';
  }
  if (
    normalized.includes('memory') ||
    normalized.includes('allocation') ||
    normalized.includes('out of memory')
  ) {
    return 'Your device is low on available memory. Close other apps, return to LearnGuide, and retry.';
  }
  if (
    normalized.includes('gemma') ||
    normalized.includes('minilm') ||
    normalized.includes('model')
  ) {
    return 'The offline AI is not ready. Open Settings to finish setup, then retry.';
  }
  if (
    normalized.includes('vector') ||
    normalized.includes('embedding') ||
    normalized.includes('index')
  ) {
    return 'Offline search could not be prepared. Your imported file is safe—retry this step.';
  }
  return message || fallback;
}
