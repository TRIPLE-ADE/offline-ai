import { Redirect } from 'expo-router';

import { getLaunchRoute } from '@/onboarding/first-run-policy';
import { hasCompletedOnboarding } from '@/onboarding/onboarding-state';

export default function IndexRoute() {
  return <Redirect href={getLaunchRoute(hasCompletedOnboarding())} />;
}
