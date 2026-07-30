import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { Paths } from 'expo-file-system';
import { useKeepAwake } from 'expo-keep-awake';
import * as Network from 'expo-network';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';

import { isOfflineAiAvailable } from '@/ai/model-capability';
import {
  saveModelInstallationState,
  useModelInstallationStore,
} from '@/ai/model-installation-state';
import {
  downloadOfflineResources,
  getOfflineResourceSizes,
  inspectOfflineResources,
} from '@/ai/offline-resource-state';
import { BrandIllustration } from '@/components/onboarding/brand-illustration';
import {
  OnboardingFooter,
  OnboardingHeader,
  OnboardingLayout,
} from '@/components/onboarding/onboarding-layout';
import {
  BenefitItem,
  PrivacyItem,
} from '@/components/onboarding/onboarding-items';
import {
  DeviceReadinessCard,
  DownloadProgress,
  RetryState,
  SetupStep,
  StatusBanner,
  SuccessState,
  type ReadinessRow,
} from '@/components/onboarding/readiness-components';
import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';
import { Radius, Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import {
  completeOnboarding,
  getOnboardingStep,
  hasCompletedOnboarding,
  saveOnboardingStep,
  type OnboardingStep,
} from '@/onboarding/onboarding-state';
import {
  getOnboardingCompletionRoute,
  type OnboardingCompletionReason,
} from '@/onboarding/first-run-policy';
import {
  deviceCompatibilityLabel,
  evaluateReadiness,
  FALLBACK_DOWNLOAD_BYTES,
  formatBytes,
} from '@/onboarding/readiness';

const FALLBACK_EMBEDDING_BYTES = 120_000_000;
const FALLBACK_GENERATION_BYTES = FALLBACK_DOWNLOAD_BYTES - FALLBACK_EMBEDDING_BYTES;

type InstallationPhase = 'idle' | 'installing' | 'preparing' | 'failed';

type ResourceSizes = {
  embedding: number;
  generation: number;
  total: number;
  exact: boolean;
};

const fallbackSizes: ResourceSizes = {
  embedding: FALLBACK_EMBEDDING_BYTES,
  generation: FALLBACK_GENERATION_BYTES,
  total: FALLBACK_DOWNLOAD_BYTES,
  exact: false,
};

const decisionSteps: Partial<Record<OnboardingStep, number>> = {
  welcome: 1,
  benefits: 2,
  privacy: 3,
  readiness: 4,
};

const onboardingSteps = new Set<OnboardingStep>([
  'welcome',
  'benefits',
  'privacy',
  'readiness',
  'installing',
  'complete',
]);

function getPreviewStep(value: string | string[] | undefined) {
  if (!__DEV__ || typeof value !== 'string') {
    return null;
  }
  return onboardingSteps.has(value as OnboardingStep)
    ? (value as OnboardingStep)
    : null;
}

function installationError(
  error: unknown,
  connected: boolean
) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (!connected || message.includes('network') || message.includes('connection')) {
    return 'Connect to the internet, then retry. Resources that finished downloading remain installed.';
  }
  if (message.includes('storage') || message.includes('disk') || message.includes('space')) {
    return 'Free up storage, then try again.';
  }
  if (message.includes('verify') || message.includes('invalid')) {
    return 'The downloaded resources could not be verified. Retry the installation on a stable connection.';
  }
  if (message.includes('memory') || message.includes('allocation')) {
    return `Close other apps to free memory, then return to ${Brand.name} and retry.`;
  }
  return 'The download was interrupted. Check your connection and try again.';
}

function InstallationWakeLock() {
  useKeepAwake('learn-guide-offline-ai-installation');
  return null;
}

export default function SetupScreen() {
  const router = useRouter();
  const { preview } = useLocalSearchParams<{ preview?: string | string[] }>();
  const previewStep = getPreviewStep(preview);
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const network = Network.useNetworkState();
  const modelInstallation = useModelInstallationStore((state) => state);
  const [onboardingComplete] = useState(hasCompletedOnboarding);
  const [step, setStep] = useState<OnboardingStep>(getOnboardingStep);
  const [readinessChecking, setReadinessChecking] = useState(true);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [availableStorage, setAvailableStorage] = useState(0);
  const [resourceSizes, setResourceSizes] = useState<ResourceSizes>(fallbackSizes);
  const [installationPhase, setInstallationPhase] = useState<InstallationPhase>('idle');
  const [installationMessage, setInstallationMessage] = useState<string | null>(null);
  const installationPromise = useRef<Promise<void> | null>(null);
  const completionReason = useRef<OnboardingCompletionReason | null>(null);
  const mounted = useRef(true);
  const [transition] = useState(() => new Animated.Value(1));
  const lastAnnouncedProgress = useRef(-1);
  const displayedStep = previewStep ?? step;
  const displayedInstallationPhase =
    previewStep === 'installing' ? 'installing' : installationPhase;

  const allInstalled = isOfflineAiAvailable(modelInstallation.availability);
  const connected = network.isConnected === true && network.isInternetReachable !== false;
  const readiness = evaluateReadiness(
    {
      availableStorage,
      totalMemory: Device.totalMemory,
      isPhysicalDevice: Device.isDevice,
      networkConnected: network.isConnected ?? null,
      internetReachable: network.isInternetReachable ?? null,
      connectionType: network.type ?? null,
    },
    resourceSizes.total
  );

  const overallProgress = useMemo(() => {
    if (previewStep === 'installing') {
      return 0.62;
    }
    if (installationPhase === 'preparing') {
      return 0.99;
    }
    return modelInstallation.downloadProgress;
  }, [
    installationPhase,
    modelInstallation.downloadProgress,
    previewStep,
  ]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const transitionTo = useCallback((next: OnboardingStep) => {
    saveOnboardingStep(next);
    setStep(next);
  }, []);

  const finishOnboarding = useCallback(
    (reason: OnboardingCompletionReason) => {
      if (completionReason.current) {
        return;
      }
      completionReason.current = reason;
      const installationActive =
        installationPromise.current !== null ||
        modelInstallation.phase === 'downloading' ||
        modelInstallation.phase === 'retrying';
      if (reason === 'model_skipped' && !allInstalled && !installationActive) {
        saveModelInstallationState('skipped');
      }
      if (reason === 'model_installed') {
        saveModelInstallationState('ready');
      }
      completeOnboarding();
      router.replace(getOnboardingCompletionRoute(reason));
    },
    [allInstalled, modelInstallation.phase, router]
  );

  const refreshReadiness = useCallback(async () => {
    setReadinessChecking(true);
    setReadinessError(null);
    try {
      setAvailableStorage(Paths.availableDiskSpace);
      const currentNetwork = await Network.getNetworkStateAsync();
      await inspectOfflineResources();
      if (
        currentNetwork.isConnected === true &&
        currentNetwork.isInternetReachable !== false
      ) {
        try {
          const sizes = await getOfflineResourceSizes();
          if (sizes.total > 0) {
            setResourceSizes({ ...sizes, exact: true });
          }
        } catch {
          setResourceSizes(fallbackSizes);
        }
      }
    } catch {
      setReadinessError(`${Brand.name} could not complete the device check. Try the check again.`);
    } finally {
      setReadinessChecking(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void refreshReadiness(), 0);
    return () => clearTimeout(timeout);
  }, [refreshReadiness]);

  useEffect(() => {
    if (reducedMotion) {
      transition.setValue(1);
      return;
    }
    transition.setValue(0);
    Animated.timing(transition, {
      duration: 180,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [displayedStep, reducedMotion, transition]);

  useEffect(() => {
    const titles: Record<OnboardingStep, string> = {
      welcome: `Welcome to ${Brand.name}`,
      benefits: `How ${Brand.name} helps`,
      privacy: 'Privacy and offline operation',
      readiness: 'Device readiness',
      installing: 'Installing offline AI',
      complete: 'Setup complete',
    };
    AccessibilityInfo.announceForAccessibility(titles[displayedStep]);
  }, [displayedStep]);

  useEffect(() => {
    if (
      previewStep ||
      step !== 'installing' ||
      installationPhase !== 'idle' ||
      readinessChecking
    ) {
      return;
    }
    const timeout = setTimeout(() => {
      if (allInstalled) {
        finishOnboarding('model_installed');
        return;
      }
      setInstallationPhase('failed');
      const message =
        'The download was interrupted. Ready when you are to install the remaining offline resources.';
      saveModelInstallationState('failed', message);
      setInstallationMessage(message);
    }, 0);
    return () => clearTimeout(timeout);
  }, [
    allInstalled,
    finishOnboarding,
    installationPhase,
    previewStep,
    readinessChecking,
    step,
  ]);

  useEffect(() => {
    if (displayedStep !== 'installing') {
      return;
    }
    const milestone = Math.floor(overallProgress * 10) * 10;
    if (milestone > 0 && milestone !== lastAnnouncedProgress.current) {
      lastAnnouncedProgress.current = milestone;
      AccessibilityInfo.announceForAccessibility(
        `Offline AI installation ${milestone} percent complete`
      );
    }
  }, [displayedStep, overallProgress]);

  const beginInstallation = useCallback(() => {
    if (installationPromise.current) {
      return installationPromise.current;
    }
    if (completionReason.current) {
      return Promise.resolve();
    }
    if (allInstalled) {
      finishOnboarding('model_installed');
      return Promise.resolve();
    }
    if (!readiness.canInstall) {
      return Promise.resolve();
    }

    transitionTo('installing');
    saveModelInstallationState(
      installationPhase === 'failed' || modelInstallation.phase === 'failed'
        ? 'retrying'
        : 'downloading'
    );
    setInstallationPhase('installing');
    setInstallationMessage(null);

    const work = (async () => {
      try {
        const resources = await downloadOfflineResources();
        if (!resources.embeddingInstalled || !resources.generationInstalled) {
          throw new Error('The offline AI resources could not be verified.');
        }
        if (mounted.current) {
          setInstallationPhase('preparing');
        }
        if (!reducedMotion) {
          await new Promise((resolve) => setTimeout(resolve, 320));
        }
        if (completionReason.current === 'model_skipped') {
          // The learner is already on Home. Preserve that navigation decision
          // while accurately recording resources that finished in the background.
          saveModelInstallationState('ready');
        } else {
          finishOnboarding('model_installed');
        }
        AccessibilityInfo.announceForAccessibility(
          'Your offline study coach is ready'
        );
      } catch (error) {
        const message = installationError(
          error,
          connected
        );
        saveModelInstallationState('failed', message);
        if (mounted.current) {
          setInstallationPhase('failed');
          setInstallationMessage(message);
        }
      } finally {
        installationPromise.current = null;
      }
    })();

    installationPromise.current = work;
    return work;
  }, [
    allInstalled,
    connected,
    finishOnboarding,
    installationPhase,
    modelInstallation.phase,
    readiness.canInstall,
    reducedMotion,
    transitionTo,
  ]);

  const progress = decisionSteps[displayedStep]
    ? { current: decisionSteps[displayedStep]!, total: 4 }
    : undefined;
  const animatedStyle = {
    opacity: transition,
    transform: [
      {
        translateY: transition.interpolate({
          inputRange: [0, 1],
          outputRange: [reducedMotion ? 0 : 8, 0],
        }),
      },
    ],
  };

  const rows: ReadinessRow[] = [
    {
      icon: 'download-outline',
      label: 'Offline AI download',
      value: `${resourceSizes.exact ? '' : 'About '}${formatBytes(resourceSizes.total)}`,
      tone: 'neutral',
    },
    {
      icon: readiness.hasStorage ? 'server-outline' : 'alert-circle-outline',
      label: 'Available storage',
      value: readinessChecking
        ? 'Checking…'
        : `${formatBytes(availableStorage)} available`,
      tone: readinessChecking
        ? 'checking'
        : readiness.hasStorage
          ? 'ready'
          : 'error',
    },
    {
      icon: readiness.compatible ? 'phone-portrait-outline' : 'warning-outline',
      label: 'Device compatibility',
      value: readinessChecking
        ? 'Checking…'
        : deviceCompatibilityLabel(
            readiness.compatible,
            Device.isDevice,
            Device.modelName
          ),
      tone: readinessChecking
        ? 'checking'
        : readiness.compatible
          ? 'ready'
          : 'error',
    },
    {
      icon:
        network.isConnected === false
          ? 'cloud-offline-outline'
          : readiness.cellular
            ? 'cellular-outline'
            : 'wifi-outline',
      label: 'Connection',
      value:
        network.isConnected === undefined
          ? 'Checking…'
          : network.isConnected === false || network.isInternetReachable === false
            ? 'Internet connection required'
            : readiness.cellular
              ? 'Mobile data connected'
              : network.type === Network.NetworkStateType.WIFI
                ? 'Wi-Fi connected'
                : 'Internet connected',
      tone:
        network.isConnected === undefined
          ? 'checking'
          : !readiness.online
            ? 'error'
            : readiness.cellular
              ? 'warning'
              : 'ready',
    },
  ];

  const currentSetupStep =
    previewStep === 'installing'
      ? 2
      : installationPhase === 'preparing'
      ? 3
      : installationPhase === 'installing' &&
          modelInstallation.downloadProgress >= 1
        ? 2
        : 1;

  return (
    <OnboardingLayout
      progress={progress}
      footer={
        displayedStep === 'welcome' ? (
          <OnboardingFooter
            primary={{ label: 'Get started', onPress: () => transitionTo('benefits') }}
          />
        ) : displayedStep === 'benefits' ? (
          <OnboardingFooter
            primary={{ label: 'Continue', onPress: () => transitionTo('privacy') }}
            secondary={{ label: 'Back', onPress: () => transitionTo('welcome') }}
          />
        ) : displayedStep === 'privacy' ? (
          <OnboardingFooter
            primary={{ label: 'Continue', onPress: () => transitionTo('readiness') }}
            secondary={{ label: 'Back', onPress: () => transitionTo('benefits') }}
          />
        ) : displayedStep === 'readiness' ? (
          <OnboardingFooter
            note={
              allInstalled
                ? 'Offline AI resources are already installed.'
                : 'You can download later from Home or Settings.'
            }
            primary={{
              disabled:
                !allInstalled &&
                (readinessChecking || Boolean(readinessError) || !readiness.canInstall),
              label: allInstalled ? 'Continue' : 'Install offline AI',
              onPress: () =>
                allInstalled
                  ? finishOnboarding('model_installed')
                  : void beginInstallation(),
            }}
            secondary={{
              label: 'Skip for now',
              onPress: () => finishOnboarding('model_skipped'),
            }}
            tertiary={{ label: 'Back', onPress: () => transitionTo('privacy') }}
          />
        ) : displayedStep === 'installing' ? (
          <OnboardingFooter
            note={
              displayedInstallationPhase === 'failed'
                ? 'Completed resources stay installed between retries.'
                : `Keep ${Brand.name} open while the offline resources are prepared.`
            }
            primary={{
              disabled:
                displayedInstallationPhase !== 'failed' ||
                !readiness.canInstall,
              label:
                displayedInstallationPhase === 'failed'
                  ? 'Retry installation'
                  : 'Installation in progress',
              loading:
                displayedInstallationPhase === 'installing' ||
                displayedInstallationPhase === 'preparing',
              onPress: () => void beginInstallation(),
            }}
            secondary={
              {
                label:
                  displayedInstallationPhase === 'failed'
                    ? 'Download later'
                    : 'Skip for now',
                onPress: () => finishOnboarding('model_skipped'),
              }
            }
            tertiary={
              displayedInstallationPhase === 'failed'
                ? {
                    label: 'Back to device check',
                    onPress: () => transitionTo('readiness'),
                  }
                : undefined
            }
          />
        ) : (
          <OnboardingFooter
            primary={{
              label: 'Go to Home',
              onPress: () => finishOnboarding('model_installed'),
            }}
          />
        )
      }>
      {!previewStep &&
        (installationPhase === 'installing' || installationPhase === 'preparing') && (
        <InstallationWakeLock />
      )}
      <Animated.View style={[styles.stepContent, animatedStyle]}>
        {displayedStep === 'welcome' ? (
          <>
            <BrandIllustration />
            <OnboardingHeader
              eyebrow={Brand.name}
              title="Turn your materials into a guided learning journey."
              subtitle={Brand.description}
            />
            <View style={[styles.privateNote, { backgroundColor: theme.secondarySoft }]}>
              <Ionicons name="lock-closed" color={theme.secondary} size={20} />
              <ThemedText type="smallBold" style={{ color: theme.secondary }}>
                Private learning, stored on your device
              </ThemedText>
            </View>
          </>
        ) : null}

        {displayedStep === 'benefits' ? (
          <>
            <OnboardingHeader
              eyebrow="A clearer way to study"
              title="From source material to your next step"
              subtitle={`${Brand.name} organizes the work so you can focus on understanding.`}
            />
            <View style={styles.itemList}>
              <BenefitItem
                detail="Add a PDF or TXT file from your course."
                icon="document-text-outline"
                index={1}
                title="Import your material"
              />
              <BenefitItem
                detail="Learn from clear explanations linked to the original source."
                icon="book-outline"
                index={2}
                title="Learn with grounded explanations"
              />
              <BenefitItem
                detail="Check your understanding and receive a useful next action."
                icon="navigate-outline"
                index={3}
                title="Test yourself and get the next step"
              />
            </View>
          </>
        ) : null}

        {displayedStep === 'privacy' ? (
          <>
            <OnboardingHeader
              eyebrow="Private and available offline"
              title="Your materials stay on this device"
              subtitle={`${Brand.name} is designed for personal study without an account or remote library.`}
            />
            <View style={styles.itemList}>
              <PrivacyItem
                detail={`Imported files are copied into ${Brand.name}’s local app storage.`}
                icon="phone-portrait-outline"
                title="Materials remain on your device"
              />
              <PrivacyItem
                detail="Conversations, results, and recommendations are stored locally."
                icon="folder-outline"
                title="Chats and progress stay local"
              />
              <PrivacyItem
                detail="After the initial resource installation, study features work without internet."
                icon="cloud-offline-outline"
                title="Offline after setup"
              />
              <PrivacyItem
                detail="Removing a material also removes its local lessons, chat, and progress."
                icon="trash-outline"
                title="You control deletion"
              />
            </View>
            <StatusBanner
              message="The first AI-resource installation needs an internet connection. No account is required."
              title="One-time online setup"
              tone="neutral"
            />
          </>
        ) : null}

        {displayedStep === 'readiness' ? (
          <>
            <OnboardingHeader
              eyebrow={onboardingComplete ? 'Offline AI' : 'Optional offline AI'}
              title="Download when you are ready"
              subtitle={`${Brand.name} needs enough storage and an internet connection once. You can skip this step and explore the app now.`}
            />
            {allInstalled ? (
              <StatusBanner
                message="You can continue without downloading the resources again."
                title="Offline AI is already installed"
                tone="ready"
              />
            ) : readinessError ? (
              <RetryState
                message={readinessError}
                onRetry={() => void refreshReadiness()}
                retrying={readinessChecking}
              />
            ) : !readinessChecking && !readiness.compatible ? (
              <StatusBanner
                message={`This AI resource needs more device memory than ${Brand.name} can safely use.`}
                title="This device is not supported"
                tone="error"
              />
            ) : !readinessChecking && !readiness.hasStorage ? (
              <StatusBanner
                message="Free up storage, then run the check again."
                title="More storage is required"
                tone="error"
              />
            ) : !readinessChecking && !readiness.online ? (
              <StatusBanner
                message="Connect to the internet to complete the initial setup."
                title="You’re currently offline"
                tone="error"
              />
            ) : readiness.cellular ? (
              <StatusBanner
                message="Installation can continue, but Wi-Fi may help avoid mobile-data charges."
                title="Using mobile data"
                tone="warning"
              />
            ) : (
              <StatusBanner
                message="This device can safely continue with the offline AI installation."
                title={readinessChecking ? 'Checking readiness' : 'Device ready'}
                tone={readinessChecking ? 'neutral' : 'ready'}
              />
            )}
            <DeviceReadinessCard checking={readinessChecking} rows={rows} />
          </>
        ) : null}

        {displayedStep === 'installing' ? (
          <>
            <OnboardingHeader
              eyebrow="One-time installation"
              title="Installing offline AI"
              subtitle={`${Brand.name} is preparing the private study resources that will run on this device.`}
            />
            <DownloadProgress
              currentStatus={
                displayedInstallationPhase === 'preparing'
                  ? 'Preparing your study assistant'
                  : currentSetupStep === 2
                    ? 'Verifying downloaded resources'
                    : displayedInstallationPhase === 'failed'
                      ? 'Installation paused'
                      : 'Downloading offline AI'
              }
              downloadedLabel={`${resourceSizes.exact ? '' : 'About '}${formatBytes(
                overallProgress * resourceSizes.total
              )}`}
              progress={overallProgress}
              totalLabel={`${resourceSizes.exact ? '' : 'about '}${formatBytes(resourceSizes.total)}`}
            />
            <View style={styles.setupSteps}>
              {[
                'Downloading offline AI',
                'Verifying resources',
                'Preparing the study assistant',
                'Ready to learn',
              ].map((label, index) => {
                const item = index + 1;
                const status =
                  displayedInstallationPhase === 'failed' && item === currentSetupStep
                    ? 'error'
                    : item < currentSetupStep
                      ? 'complete'
                      : item === currentSetupStep
                        ? 'current'
                        : 'pending';
                return (
                  <SetupStep
                    key={label}
                    index={item}
                    label={label}
                    status={status}
                  />
                );
              })}
            </View>
            {!connected && displayedInstallationPhase !== 'failed' ? (
              <StatusBanner
                message="Reconnect to continue the initial setup."
                title="Connection lost"
                tone="warning"
              />
            ) : null}
            {displayedInstallationPhase === 'failed' && installationMessage ? (
              <RetryState message={installationMessage} />
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Keep {Brand.name} open during installation. You can use other apps briefly, but closing {Brand.name} may interrupt the current file.
              </ThemedText>
            )}
          </>
        ) : null}

        {displayedStep === 'complete' ? (
          <SuccessState
            message="Explore Home now and import learning material whenever you are ready."
            title="Your offline study coach is ready.">
            <View style={[styles.readyDetail, { backgroundColor: theme.successSoft }]}>
              <Ionicons name="cloud-offline-outline" color={theme.success} size={22} />
              <ThemedText type="smallBold" style={{ color: theme.success }}>
                Lessons, chat, assessments, and recommendations are ready offline
              </ThemedText>
            </View>
          </SuccessState>
        ) : null}
      </Animated.View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  stepContent: { gap: Spacing.four },
  itemList: { gap: Spacing.four },
  privateNote: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Radius.medium,
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  setupSteps: { gap: Spacing.three, paddingHorizontal: Spacing.one },
  readyDetail: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
    padding: Spacing.three,
  },
});
