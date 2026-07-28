import { Stack } from 'expo-router';

import TopicAssessmentScreen from '@/screens/topic-assessment-screen';

export default function TopicAssessmentRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          title: 'Knowledge check',
        }}
      />
      <TopicAssessmentScreen />
    </>
  );
}
