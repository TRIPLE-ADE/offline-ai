export type OnboardingCompletionReason = 'model_installed' | 'model_skipped';

export type ModelInstallationPhase =
  | 'not_started'
  | 'skipped'
  | 'downloading'
  | 'retrying'
  | 'ready'
  | 'failed';

export type LearningFeatureAccessInput = {
  hasMaterial: boolean;
  modelInstalled: boolean;
  requiresMaterial?: boolean;
  requiresModel?: boolean;
};

export type LearningFeatureAccessDecision =
  | { allowed: true; prompt: null }
  | { allowed: false; prompt: 'download_model' | 'import_material' };

export const HOME_ROUTE = '/home' as const;

export const HOME_EMPTY_STATE_COPY = {
  title: 'Ready when you are',
  body: 'Import a PDF or TXT file to create your first private study path.',
  optionalModel:
    'You can explore now and download the AI model whenever you’re ready.',
  primaryAction: 'Import material',
  secondaryAction: 'Download offline AI',
} as const;

export function getLaunchRoute(onboardingComplete: boolean) {
  return onboardingComplete ? HOME_ROUTE : ('/setup' as const);
}

export function getOnboardingCompletionRoute(
  _reason: OnboardingCompletionReason
) {
  return HOME_ROUTE;
}

export function reconcileModelInstallationPhase(
  persistedPhase: ModelInstallationPhase,
  resourcesInstalled: boolean
): ModelInstallationPhase {
  if (resourcesInstalled) {
    return 'ready';
  }
  if (
    persistedPhase === 'downloading' ||
    persistedPhase === 'retrying' ||
    persistedPhase === 'ready'
  ) {
    return 'failed';
  }
  return persistedPhase;
}

export function evaluateLearningFeatureAccess({
  hasMaterial,
  modelInstalled,
  requiresMaterial = true,
  requiresModel = true,
}: LearningFeatureAccessInput): LearningFeatureAccessDecision {
  if (requiresMaterial && !hasMaterial) {
    return { allowed: false, prompt: 'import_material' };
  }
  if (requiresModel && !modelInstalled) {
    return { allowed: false, prompt: 'download_model' };
  }
  return { allowed: true, prompt: null };
}
