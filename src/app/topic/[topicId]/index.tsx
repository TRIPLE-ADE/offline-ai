import { useLocalSearchParams } from 'expo-router';

import { FeaturePlaceholder } from '@/components/foundation/feature-placeholder';

export default function TopicLessonScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();

  return (
    <FeaturePlaceholder
      eyebrow="Stage 5 route ready"
      title="Grounded topic lesson"
      description="Lesson generation remains gated behind source retrieval and the topic roadmap."
      detail={`Topic: ${topicId}`}
    />
  );
}
