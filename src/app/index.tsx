import { Redirect } from 'expo-router';

import { hasCompletedOnboarding } from '@/onboarding/onboarding-state';

export default function IndexRoute() {
  return <Redirect href={hasCompletedOnboarding() ? '/library' : '/setup'} />;
}
