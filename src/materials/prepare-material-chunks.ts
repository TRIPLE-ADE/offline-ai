import * as Crypto from 'expo-crypto';

import type { CreateMaterialChunkInput } from '@/db/types';
import { chunkText } from '@/materials/chunk-text';

async function contentHash(ordinal: number, content: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${ordinal}\n${content}`
  );
}

export async function prepareMaterialChunks(
  materialId: string,
  text: string
): Promise<CreateMaterialChunkInput[]> {
  const drafts = chunkText(text);

  return Promise.all(
    drafts.map(async (draft) => {
      const hash = await contentHash(draft.ordinal, draft.content);
      return {
        id: `${materialId}:${hash.slice(0, 24)}`,
        materialId,
        ordinal: draft.ordinal,
        content: draft.content,
        pageStart: null,
        pageEnd: null,
        sectionTitle: draft.sectionTitle,
        contentHash: hash,
      };
    })
  );
}
