import { File } from 'expo-file-system';

import type { Material } from '@/db/types';

const MAX_EXTRACTED_CHARACTERS = 2_000_000;
export const MIN_EXTRACTED_CHARACTERS = 40;

export type ExtractedMaterial = {
  text: string;
  warning: string | null;
};

function assertUsableText(text: string) {
  const normalized = text.trim();
  if (normalized.includes('\0')) {
    throw new Error('This TXT file appears to contain binary data.');
  }
  if (normalized.length < MIN_EXTRACTED_CHARACTERS) {
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

export async function extractMaterialText(
  material: Pick<Material, 'fileType' | 'localUri'>
): Promise<ExtractedMaterial> {
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
  let text: string;
  try {
    text = await readPDF(nativeFilePath(material.localUri));
  } catch {
    throw new Error(
      'This PDF could not be read. It may be encrypted, damaged, or image-only.'
    );
  }

  return {
    text: assertUsableText(text),
    warning: 'PDF text was indexed, but this extractor does not preserve page-level citations.',
  };
}
