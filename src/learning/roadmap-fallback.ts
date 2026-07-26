import type { MaterialChunk } from '@/db/types';
import type { TopicDraft } from '@/learning/schemas';

const GROUP_SIZE = 4;

function firstSentence(content: string) {
  return (
    content
      .replace(/\s+/g, ' ')
      .trim()
      .split(/(?<=[.!?])\s+/)[0]
      ?.slice(0, 240) || 'Study the ideas covered in these source passages.'
  );
}

export function buildDeterministicTopicDrafts(
  chunks: MaterialChunk[]
): TopicDraft[] {
  if (chunks.length === 0) {
    return [];
  }

  const drafts: TopicDraft[] = [];
  let current: MaterialChunk[] = [];
  let currentSection: string | null = null;

  const flush = () => {
    if (current.length === 0) {
      return;
    }
    const first = current[0];
    drafts.push({
      title:
        currentSection?.trim() ||
        `Material section ${drafts.length + 1}`,
      summary: firstSentence(first.content),
      sourceChunkIds: current.map((chunk) => chunk.id),
    });
    current = [];
  };

  for (const chunk of chunks) {
    const nextSection = chunk.sectionTitle?.trim() || null;
    const sectionChanged =
      current.length > 0 &&
      nextSection !== null &&
      currentSection !== null &&
      nextSection !== currentSection;
    if (sectionChanged || current.length >= GROUP_SIZE) {
      flush();
    }
    currentSection = nextSection ?? currentSection;
    current.push(chunk);
  }
  flush();

  return drafts;
}
