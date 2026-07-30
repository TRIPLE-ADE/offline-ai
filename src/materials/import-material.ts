import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, FileMode, Paths } from 'expo-file-system';

import type {
  CreateMaterialInput,
  Material,
  MaterialFileType,
  MaterialSourceFileState,
} from '@/db/types';
import { extractMaterialText } from '@/materials/extract-material-text';

const MATERIALS_DIRECTORY_NAME = 'materials';
const MATERIAL_STAGING_DIRECTORY_NAME = 'material-import-staging';
const MAX_IMPORT_FILE_BYTES = 25 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = ['text/plain', 'application/pdf'];
const MISSING_SOURCE_MESSAGE =
  'The private source file is missing from this device. Import the file again or remove this material.';

const materialsDirectory = () =>
  new Directory(Paths.document, MATERIALS_DIRECTORY_NAME);
const stagingDirectory = () =>
  new Directory(Paths.cache, MATERIAL_STAGING_DIRECTORY_NAME);

export type StagedMaterialImport = Omit<
  CreateMaterialInput,
  'localUri' | 'sourceUri'
> & {
  stagedUri: string;
};

type MaterialImportRepository = {
  create(input: CreateMaterialInput): Promise<Material>;
  list(): Promise<Material[]>;
  updateSourceFileState(
    id: string,
    sourceFileState: MaterialSourceFileState
  ): Promise<void>;
};

export type MaterialFileReconciliation = {
  missingMaterialIds: string[];
  removedOrphanUris: string[];
  removedStagingUris: string[];
};

function getFileType(fileName: string, mimeType?: string): MaterialFileType {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension !== 'txt' && extension !== 'pdf') {
    throw new Error('Only TXT and clean, text-based PDF materials are supported.');
  }

  const fileType: MaterialFileType = extension;
  const knownMimeType =
    mimeType === 'text/plain'
      ? 'txt'
      : mimeType === 'application/pdf'
        ? 'pdf'
        : null;
  if (knownMimeType && knownMimeType !== fileType) {
    throw new Error('The file extension does not match the selected file type.');
  }

  return fileType;
}

function getTitle(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '').trim() || 'Untitled material';
}

function ensureDirectory(directory: Directory) {
  directory.create({
    idempotent: true,
    intermediates: true,
  });
}

function deleteFileIfPresent(file: File) {
  try {
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Launch reconciliation retries cleanup for app-owned staging and material files.
  }
}

function normalizedUri(uri: string) {
  try {
    return decodeURI(uri).replace(/\/+$/, '');
  } catch {
    return uri.replace(/\/+$/, '');
  }
}

function isReadableFile(file: File) {
  try {
    return file.exists && file.size > 0;
  } catch {
    return false;
  }
}

function assertImportSize(size: number | null) {
  if (size === null || !Number.isFinite(size) || size <= 0) {
    throw new Error('The selected file is empty or could not be read.');
  }
  if (size > MAX_IMPORT_FILE_BYTES) {
    throw new Error('Choose a file smaller than 25 MB.');
  }
}

async function validateStagedFile(
  stagedFile: File,
  fileType: MaterialFileType
) {
  if (!stagedFile.exists) {
    throw new Error('The selected file could not be copied for validation.');
  }
  assertImportSize(stagedFile.size);
  if (fileType === 'pdf') {
    const handle = stagedFile.open(FileMode.ReadOnly);
    try {
      const signature = [...handle.readBytes(5)];
      if (
        signature.length !== 5 ||
        signature.some(
          (byte, index) => byte !== [37, 80, 68, 70, 45][index]
        )
      ) {
        throw new Error('This file does not contain a valid PDF document.');
      }
    } finally {
      handle.close();
    }
  }
  await extractMaterialText({
    fileType,
    localUri: stagedFile.uri,
  });
}

export async function importMaterial(): Promise<StagedMaterialImport | null> {
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
  const source = new File(asset.uri);
  assertImportSize(asset.size ?? source.size ?? null);

  const directory = stagingDirectory();
  ensureDirectory(directory);

  const stagedFile = new File(directory, `${id}.${fileType}`);
  try {
    await source.copy(stagedFile);
    await validateStagedFile(stagedFile, fileType);
  } catch (error) {
    deleteFileIfPresent(stagedFile);
    throw error;
  }

  return {
    id,
    title: getTitle(asset.name),
    stagedUri: stagedFile.uri,
    fileType,
    fileSize: stagedFile.size,
  };
}

export function discardStagedMaterial(staged: StagedMaterialImport | null) {
  if (!staged) {
    return;
  }
  deleteFileIfPresent(new File(staged.stagedUri));
}

export async function commitStagedMaterial(
  repository: Pick<MaterialImportRepository, 'create'>,
  staged: StagedMaterialImport
) {
  const stagedFile = new File(staged.stagedUri);
  if (!stagedFile.exists) {
    throw new Error('The selected file is no longer available. Choose it again.');
  }

  const directory = materialsDirectory();
  ensureDirectory(directory);
  const permanentFile = new File(directory, `${staged.id}.${staged.fileType}`);

  try {
    await stagedFile.copy(permanentFile);
    if (!permanentFile.exists) {
      throw new Error('The private material copy could not be created.');
    }
    if (permanentFile.size !== stagedFile.size) {
      throw new Error('The private material copy was incomplete.');
    }

    const material = await repository.create({
      id: staged.id,
      title: staged.title,
      sourceUri: permanentFile.uri,
      localUri: permanentFile.uri,
      fileType: staged.fileType,
      fileSize: permanentFile.size,
    });
    deleteFileIfPresent(stagedFile);
    return material;
  } catch (error) {
    deleteFileIfPresent(permanentFile);
    deleteFileIfPresent(stagedFile);
    throw error;
  }
}

export async function reconcileMaterialFileStorage(
  repository: Pick<
    MaterialImportRepository,
    'list' | 'updateSourceFileState'
  >
): Promise<MaterialFileReconciliation> {
  const materials = await repository.list();
  const referencedUris = new Set(
    materials.map((material) => normalizedUri(material.localUri))
  );
  const missingMaterialIds: string[] = [];
  const removedOrphanUris: string[] = [];
  const removedStagingUris: string[] = [];

  for (const material of materials) {
    const sourceFile = new File(material.localUri);
    const nextState: MaterialSourceFileState = isReadableFile(sourceFile)
      ? 'available'
      : 'missing';
    if (nextState === 'missing') {
      missingMaterialIds.push(material.id);
    }
    if (material.sourceFileState !== nextState) {
      await repository.updateSourceFileState(material.id, nextState);
    }
  }

  const permanentDirectory = materialsDirectory();
  if (permanentDirectory.exists) {
    for (const entry of permanentDirectory.list()) {
      if (
        entry instanceof File &&
        /^[0-9a-f-]{36}\.(txt|pdf)$/i.test(entry.name) &&
        !referencedUris.has(normalizedUri(entry.uri))
      ) {
        deleteFileIfPresent(entry);
        if (!entry.exists) {
          removedOrphanUris.push(entry.uri);
        }
      }
    }
  }

  const stagedDirectory = stagingDirectory();
  if (stagedDirectory.exists) {
    for (const entry of stagedDirectory.list()) {
      if (entry instanceof File) {
        deleteFileIfPresent(entry);
        if (!entry.exists) {
          removedStagingUris.push(entry.uri);
        }
      }
    }
  }

  return {
    missingMaterialIds,
    removedOrphanUris,
    removedStagingUris,
  };
}

export { MISSING_SOURCE_MESSAGE };
