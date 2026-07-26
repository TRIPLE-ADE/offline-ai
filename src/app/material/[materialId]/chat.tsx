import { useLocalSearchParams } from 'expo-router';

import { FeaturePlaceholder } from '@/components/foundation/feature-placeholder';

export default function MaterialChatScreen() {
  const { materialId } = useLocalSearchParams<{ materialId: string }>();

  return (
    <FeaturePlaceholder
      eyebrow="Stage 7 route ready"
      title="Chat with Material"
      description="The route and persistence schema are ready. Grounded responses stay disabled until Stage 3 proves material-scoped retrieval and source labels."
      detail={`Material: ${materialId}`}
    />
  );
}
