import { useLocalSearchParams } from 'expo-router';

import { FeaturePlaceholder } from '@/components/foundation/feature-placeholder';

export default function TopicQuizScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();

  return (
    <FeaturePlaceholder
      eyebrow="Stage 6 route ready"
      title="Five-question knowledge check"
      description="Quiz generation and deterministic scoring will be activated after grounded lessons pass their exit gate."
      detail={`Topic: ${topicId}`}
    />
  );
}
