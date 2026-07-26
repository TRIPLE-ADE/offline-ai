import { File } from 'expo-file-system';

import type { Material } from '@/db/types';

const MAX_EXTRACTED_CHARACTERS = 2_000_000;

export type ExtractedMaterial = {
  text: string;
  warning: string | null;
};

function assertUsableText(text: string) {
  const normalized = text.trim();
  if (normalized.length < 40) {
    throw new Error('The material does not contain enough selectable text to index.');
  }
  if (normalized.length > MAX_EXTRACTED_CHARACTERS) {
    throw new Error('This material is too large for the first offline indexing build.');
  }
  return normalized;
}

function nativeFilePath(uri: string) {
  return decodeURI(uri.replace(/^file:\/\//, ''));
}

export async function extractMaterialText(material: Material): Promise<ExtractedMaterial> {
  const file = new File(material.localUri);
  if (!file.exists) {
    throw new Error('The locally stored material could not be found.');
  }

  if (material.fileType === 'txt') {
    return {
      text: assertUsableText(await file.text()),
      warning: null,
    };
  }

  const { readPDF } = await import('react-native-pdfium');
  const text = await readPDF(nativeFilePath(material.localUri));

  return {
    text: assertUsableText(text),
    warning: 'PDF text was indexed, but this extractor does not preserve page-level citations.',
  };
}
