import { File, Paths } from 'expo-file-system';

const ONBOARDING_MARKER = new File(Paths.document, 'soma-onboarding-v1.complete');

export function hasCompletedOnboarding() {
  return ONBOARDING_MARKER.exists;
}

export function completeOnboarding() {
  if (!ONBOARDING_MARKER.exists) {
    ONBOARDING_MARKER.create({ intermediates: true });
    ONBOARDING_MARKER.write('complete');
  }
}
