import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';

import type { CreateMaterialInput, MaterialFileType } from '@/db/types';

const MATERIALS_DIRECTORY = new Directory(Paths.document, 'materials');
const SUPPORTED_MIME_TYPES = ['text/plain', 'application/pdf'];

function getFileType(fileName: string, mimeType?: string): MaterialFileType {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension === 'txt' || mimeType === 'text/plain') {
    return 'txt';
  }
  if (extension === 'pdf' || mimeType === 'application/pdf') {
    return 'pdf';
  }

  throw new Error('Only TXT and clean, text-based PDF materials are supported.');
}

function getTitle(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '').trim() || 'Untitled material';
}

export async function importMaterial(): Promise<CreateMaterialInput | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: SUPPORTED_MIME_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  const id = Crypto.randomUUID();
  const fileType = getFileType(asset.name, asset.mimeType);

  MATERIALS_DIRECTORY.create({
    idempotent: true,
    intermediates: true,
  });

  const source = new File(asset.uri);
  const destination = new File(MATERIALS_DIRECTORY, `${id}.${fileType}`);
  await source.copy(destination);

  return {
    id,
    title: getTitle(asset.name),
    sourceUri: asset.uri,
    localUri: destination.uri,
    fileType,
    fileSize: asset.size ?? source.size ?? null,
  };
}
