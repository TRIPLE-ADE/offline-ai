export const DEFAULT_MAX_CHUNK_CHARACTERS = 900;
export const DEFAULT_OVERLAP_CHARACTERS = 120;

export type ChunkDraft = {
  ordinal: number;
  content: string;
  sectionTitle: string | null;
};

type ChunkTextOptions = {
  maxCharacters?: number;
  overlapCharacters?: number;
};

function normalizeText(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function looksLikeHeading(block: string) {
  if (block.includes('\n') || block.length > 120) {
    return false;
  }

  const trimmed = block.trim();
  return (
    /^\d+(?:\.\d+)*[.)]?\s+\S/.test(trimmed) ||
    /^[A-Z][A-Z0-9 &:/—–-]{3,}$/.test(trimmed) ||
    /^(summary|introduction|conclusion|overview)$/i.test(trimmed)
  );
}

function splitLongBlock(block: string, maxCharacters: number) {
  if (block.length <= maxCharacters) {
    return [block];
  }

  const words = block.split(/\s+/);
  const parts: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharacters && current) {
      parts.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

function overlapTail(content: string, overlapCharacters: number) {
  if (overlapCharacters <= 0 || content.length <= overlapCharacters) {
    return overlapCharacters <= 0 ? '' : content;
  }

  const rawTail = content.slice(-overlapCharacters);
  const firstWhitespace = rawTail.search(/\s/);
  return (firstWhitespace >= 0 ? rawTail.slice(firstWhitespace + 1) : rawTail).trim();
}

export function chunkText(text: string, options: ChunkTextOptions = {}): ChunkDraft[] {
  const maxCharacters = options.maxCharacters ?? DEFAULT_MAX_CHUNK_CHARACTERS;
  const overlapCharacters = options.overlapCharacters ?? DEFAULT_OVERLAP_CHARACTERS;

  if (maxCharacters < 200) {
    throw new Error('maxCharacters must be at least 200.');
  }
  if (overlapCharacters < 0 || overlapCharacters >= maxCharacters / 2) {
    throw new Error('overlapCharacters must be non-negative and less than half the chunk size.');
  }

  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  const blocks = normalized.split(/\n{2,}/).flatMap((block) => {
    const trimmed = block.trim();
    return splitLongBlock(trimmed, maxCharacters);
  });

  const chunks: Omit<ChunkDraft, 'ordinal'>[] = [];
  let current = '';
  let currentSection: string | null = null;

  const flush = () => {
    const content = current.trim();
    if (content) {
      chunks.push({ content, sectionTitle: currentSection });
    }
    current = '';
  };

  for (const block of blocks) {
    const isHeading = looksLikeHeading(block);

    if (isHeading && current) {
      if (current.trim() === currentSection) {
        current = '';
      } else {
        flush();
      }
    }
    if (isHeading) {
      currentSection = block.trim();
    }

    const candidate = current ? `${current}\n\n${block}` : block;
    if (candidate.length <= maxCharacters) {
      current = candidate;
      continue;
    }

    const prior = current;
    flush();

    const overlap = isHeading ? '' : overlapTail(prior, overlapCharacters);
    current = overlap ? `${overlap}\n\n${block}` : block;

    if (current.length > maxCharacters) {
      const parts = splitLongBlock(current, maxCharacters);
      current = parts.pop() ?? '';
      for (const part of parts) {
        chunks.push({ content: part, sectionTitle: currentSection });
      }
    }
  }

  flush();

  return chunks.map((chunk, ordinal) => ({
    ...chunk,
    ordinal,
  }));
}
