import {
  evaluateLearningFeatureAccess,
  getLaunchRoute,
  getOnboardingCompletionRoute,
  HOME_EMPTY_STATE_COPY,
  reconcileModelInstallationPhase,
} from '@/onboarding/first-run-policy';

describe('first-run and optional setup policy', () => {
  it('sends users who skip the model download to Home', () => {
    expect(getOnboardingCompletionRoute('model_skipped')).toBe('/home');
    expect(getLaunchRoute(true)).toBe('/home');
  });

  it('sends users to Home after a successful model installation', () => {
    expect(getOnboardingCompletionRoute('model_installed')).toBe('/home');
    expect(reconcileModelInstallationPhase('downloading', true)).toBe('ready');
  });

  it('keeps Home usable with no model and no imported material', () => {
    expect(
      evaluateLearningFeatureAccess({
        hasMaterial: false,
        modelInstalled: false,
        requiresMaterial: false,
        requiresModel: false,
      })
    ).toEqual({ allowed: true, prompt: null });
    expect(HOME_EMPTY_STATE_COPY.primaryAction).toBe('Import material');
    expect(HOME_EMPTY_STATE_COPY.secondaryAction).toBe('Download offline AI');
    expect(HOME_EMPTY_STATE_COPY.optionalModel).toContain(
      'download the AI model whenever you’re ready'
    );
  });

  it('prompts for a model when a model-dependent action is used', () => {
    expect(
      evaluateLearningFeatureAccess({
        hasMaterial: true,
        modelInstalled: false,
      })
    ).toEqual({ allowed: false, prompt: 'download_model' });
  });

  it('guides source-dependent actions to import material first', () => {
    expect(
      evaluateLearningFeatureAccess({
        hasMaterial: false,
        modelInstalled: true,
      })
    ).toEqual({ allowed: false, prompt: 'import_material' });
  });

  it('preserves skipped state and marks interrupted downloads for retry', () => {
    expect(reconcileModelInstallationPhase('skipped', false)).toBe('skipped');
    expect(reconcileModelInstallationPhase('downloading', false)).toBe(
      'failed'
    );
    expect(reconcileModelInstallationPhase('retrying', false)).toBe('failed');
  });
});
