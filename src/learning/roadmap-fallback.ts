import type { MaterialChunk } from '@/db/types';
import type { TopicDraft } from '@/learning/schemas';

const GROUP_SIZE = 4;
const MAX_TOPICS = 24;

function firstSentence(content: string) {
  const sentence =
    content
      .replace(/\s+/g, ' ')
      .trim()
      .split(/(?<=[.!?])\s+/)[0]
      ?.slice(0, 240) || 'Study the ideas covered in these source passages.';
  return sentence.length >= 8 ? sentence : `Study: ${sentence}`;
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
        currentSection?.trim().slice(0, 100) ||
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

/**
 * Keep complete source coverage while limiting very long materials to a
 * readable roadmap. Buckets are distributed evenly so a 25-topic roadmap
 * becomes 24 topics instead of collapsing half of the material into one item.
 */
export function capTopicDrafts(
  drafts: TopicDraft[],
  maximum = MAX_TOPICS
): TopicDraft[] {
  if (drafts.length <= maximum) {
    return drafts;
  }

  return Array.from({ length: maximum }, (_, bucketIndex) => {
    const start = Math.floor((bucketIndex * drafts.length) / maximum);
    const end = Math.floor(((bucketIndex + 1) * drafts.length) / maximum);
    const bucket = drafts.slice(start, Math.max(start + 1, end));
    const first = bucket[0];

    return {
      title: first.title,
      summary: bucket
        .map((topic) => topic.summary)
        .join(' ')
        .slice(0, 320),
      sourceChunkIds: [
        ...new Set(bucket.flatMap((topic) => topic.sourceChunkIds)),
      ],
    };
  });
}
