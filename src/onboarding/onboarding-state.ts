import { File, Paths } from 'expo-file-system';

const ONBOARDING_MARKER = new File(Paths.document, 'soma-onboarding-v1.complete');
const ONBOARDING_PROGRESS = new File(Paths.document, 'soma-onboarding-v2.progress.json');

export type OnboardingStep =
  | 'welcome'
  | 'benefits'
  | 'privacy'
  | 'readiness'
  | 'installing'
  | 'complete';

const validSteps = new Set<OnboardingStep>([
  'welcome',
  'benefits',
  'privacy',
  'readiness',
  'installing',
  'complete',
]);

export function hasCompletedOnboarding() {
  return ONBOARDING_MARKER.exists;
}

export function getOnboardingStep(): OnboardingStep {
  if (hasCompletedOnboarding() || !ONBOARDING_PROGRESS.exists) {
    return hasCompletedOnboarding() ? 'readiness' : 'welcome';
  }

  try {
    const parsed = JSON.parse(ONBOARDING_PROGRESS.textSync()) as { step?: unknown };
    return typeof parsed.step === 'string' && validSteps.has(parsed.step as OnboardingStep)
      ? (parsed.step as OnboardingStep)
      : 'welcome';
  } catch {
    return 'welcome';
  }
}

export function saveOnboardingStep(step: OnboardingStep) {
  if (!ONBOARDING_PROGRESS.exists) {
    ONBOARDING_PROGRESS.create({ intermediates: true });
  }
  ONBOARDING_PROGRESS.write(JSON.stringify({ step, updatedAt: new Date().toISOString() }));
}

export function completeOnboarding() {
  if (!ONBOARDING_MARKER.exists) {
    ONBOARDING_MARKER.create({ intermediates: true });
    ONBOARDING_MARKER.write('complete');
  }
  if (ONBOARDING_PROGRESS.exists) {
    ONBOARDING_PROGRESS.delete();
  }
}
