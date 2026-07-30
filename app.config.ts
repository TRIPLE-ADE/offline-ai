import type { ConfigContext, ExpoConfig } from 'expo/config';

const DEVELOPMENT_VARIANT = 'development';
const isDevelopment = process.env.APP_VARIANT === DEVELOPMENT_VARIANT;

const productionIdentifier = 'com.tripletech.offlineai';
const developmentIdentifier = `${productionIdentifier}.dev`;
const lightSplashBackground = '#FFFFFF';
const darkSplashBackground = '#0F1219';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isDevelopment ? 'LearnGuide (Dev)' : 'LearnGuide',
  description: 'Learn from your own materials, privately and offline.',
  slug: 'offline-ai',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: isDevelopment ? 'offlineai-dev' : 'offlineai',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    supportsTablet: false,
    bundleIdentifier: isDevelopment
      ? developmentIdentifier
      : productionIdentifier,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    softwareKeyboardLayoutMode: 'resize',
    predictiveBackGestureEnabled: false,
    package: isDevelopment ? developmentIdentifier : productionIdentifier,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-dev-client',
      {
        addGeneratedScheme: isDevelopment,
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: lightSplashBackground,
        image: './assets/images/splash-mark.png',
        imageWidth: 144,
        resizeMode: 'contain',
        dark: {
          backgroundColor: darkSplashBackground,
          image: './assets/images/splash-mark-dark.png',
        },
      },
    ],
    'expo-asset',
    [
      'expo-sqlite',
      {
        enableFTS: true,
      },
    ],
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '17.0',
        },
      },
    ],
    './plugins/with-expo-sqlite-header-isolation',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...config.extra,
    appVariant: isDevelopment ? DEVELOPMENT_VARIANT : 'production',
    brand: {
      appName: 'LearnGuide',
      description: 'Learn from your own materials, privately and offline.',
      storeTitle: 'LearnGuide: Study Offline',
      tagline: 'Your offline study guide.',
    },
    eas: {
      projectId: '3faeb6c9-5afe-469e-b5e7-5b548b2c7018',
    },
  },
});
