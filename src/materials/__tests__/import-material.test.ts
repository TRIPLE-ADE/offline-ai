import type { Material } from '@/db/types';
import type { StagedMaterialImport } from '@/materials/import-material';

const mockFiles = new Map<string, { bytes: Uint8Array; text: string }>();
const mockDirectories = new Set<string>();
const mockGetDocumentAsync = jest.fn();
const mockRandomUUID = jest.fn(
  () => '11111111-1111-4111-8111-111111111111'
);

function mockJoinPath(parts: unknown[]) {
  const resolved = parts
    .map((part) =>
      typeof part === 'string'
        ? part
        : (part as { uri: string }).uri
    );
  return resolved.reduce(
    (path, part, index) =>
      index === 0
        ? part.replace(/\/$/, '')
        : `${path}/${part.replace(/^\/|\/$/g, '')}`,
    ''
  );
}

jest.mock('expo-crypto', () => ({
  randomUUID: () => mockRandomUUID(),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

jest.mock('expo-file-system', () => {
  class MockDirectory {
    uri: string;

    constructor(...parts: unknown[]) {
      this.uri = mockJoinPath(parts).replace(/\/$/, '');
    }

    get exists() {
      return mockDirectories.has(this.uri);
    }

    create() {
      mockDirectories.add(this.uri);
    }

    list() {
      const prefix = `${this.uri}/`;
      return [...mockFiles.keys()]
        .filter((uri) => {
          const relative = uri.slice(prefix.length);
          return uri.startsWith(prefix) && !relative.includes('/');
        })
        .map((uri) => new MockFile(uri));
    }
  }

  class MockFile {
    uri: string;

    constructor(...parts: unknown[]) {
      this.uri = mockJoinPath(parts);
    }

    get exists() {
      return mockFiles.has(this.uri);
    }

    get name() {
      return this.uri.split('/').pop() ?? '';
    }

    get size() {
      return mockFiles.get(this.uri)?.bytes.length ?? 0;
    }

    async copy(destination: MockFile) {
      const contents = mockFiles.get(this.uri);
      if (!contents) {
        throw new Error('Source file does not exist.');
      }
      if (mockFiles.has(destination.uri)) {
        throw new Error('Destination already exists.');
      }
      mockFiles.set(destination.uri, {
        bytes: new Uint8Array(contents.bytes),
        text: contents.text,
      });
    }

    delete() {
      if (!mockFiles.delete(this.uri)) {
        throw new Error('File does not exist.');
      }
    }

    async text() {
      const contents = mockFiles.get(this.uri);
      if (!contents) {
        throw new Error('File does not exist.');
      }
      return contents.text;
    }

    open() {
      const contents = mockFiles.get(this.uri);
      if (!contents) {
        throw new Error('File does not exist.');
      }
      return {
        close: jest.fn(),
        readBytes: (length: number) => contents.bytes.slice(0, length),
      };
    }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    FileMode: { ReadOnly: 'r' },
    Paths: {
      cache: 'file:///cache',
      document: 'file:///documents',
    },
  };
});

const {
  commitStagedMaterial,
  discardStagedMaterial,
  importMaterial,
  reconcileMaterialFileStorage,
} = jest.requireActual<typeof import('@/materials/import-material')>(
  '@/materials/import-material'
);

const pickerUri = 'file:///picker/networking.txt';
const validText =
  'Computer networks connect devices so that they can exchange data through agreed protocols.';

function addMockFile(uri: string, text = validText) {
  mockFiles.set(uri, {
    bytes: new TextEncoder().encode(text),
    text,
  });
}

function material(
  overrides: Partial<Material> = {}
): Material {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Networking',
    sourceUri: pickerUri,
    localUri:
      'file:///documents/materials/11111111-1111-4111-8111-111111111111.txt',
    fileType: 'txt',
    fileSize: validText.length,
    sourceFileState: 'available',
    status: 'imported',
    statusMessage: null,
    chunkCount: 0,
    createdAt: '2026-07-30T00:00:00.000Z',
    updatedAt: '2026-07-30T00:00:00.000Z',
    ...overrides,
  };
}

function stagedImport(): StagedMaterialImport {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Networking',
    stagedUri:
      'file:///cache/material-import-staging/11111111-1111-4111-8111-111111111111.txt',
    fileType: 'txt',
    fileSize: validText.length,
  };
}

describe('material import file ownership', () => {
  beforeEach(() => {
    mockFiles.clear();
    mockDirectories.clear();
    mockGetDocumentAsync.mockReset();
    mockRandomUUID.mockClear();
  });

  it('does not create a staged or permanent file when picking is cancelled', async () => {
    mockGetDocumentAsync.mockResolvedValue({ canceled: true });

    await expect(importMaterial()).resolves.toBeNull();
    expect(mockFiles.size).toBe(0);
  });

  it('validates into app-owned staging without claiming permanent ownership', async () => {
    addMockFile(pickerUri);
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          mimeType: 'text/plain',
          name: 'networking.txt',
          size: validText.length,
          uri: pickerUri,
        },
      ],
    });

    const staged = await importMaterial();

    expect(staged?.stagedUri).toContain(
      'file:///cache/material-import-staging/'
    );
    expect(
      [...mockFiles.keys()].some((uri) =>
        uri.startsWith('file:///documents/materials/')
      )
    ).toBe(false);
  });

  it('rejects a mislabeled PDF and removes its staging copy', async () => {
    const fakePdfUri = 'file:///picker/fake.pdf';
    addMockFile(fakePdfUri);
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          mimeType: 'application/pdf',
          name: 'fake.pdf',
          size: validText.length,
          uri: fakePdfUri,
        },
      ],
    });

    await expect(importMaterial()).rejects.toThrow(
      'valid PDF document'
    );
    expect(
      [...mockFiles.keys()].some((uri) =>
        uri.startsWith('file:///cache/material-import-staging/')
      )
    ).toBe(false);
  });

  it('promotes a confirmed stage and deletes the staging copy', async () => {
    const staged = stagedImport();
    addMockFile(staged.stagedUri);
    const create = jest.fn(async (input) =>
      material({
        fileSize: input.fileSize,
        localUri: input.localUri,
      })
    );

    const saved = await commitStagedMaterial({ create }, staged);

    expect(saved.localUri).toBe(
      'file:///documents/materials/11111111-1111-4111-8111-111111111111.txt'
    );
    expect(mockFiles.has(saved.localUri)).toBe(true);
    expect(mockFiles.has(staged.stagedUri)).toBe(false);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('compensates both file copies when database persistence fails', async () => {
    const staged = stagedImport();
    addMockFile(staged.stagedUri);
    const create = jest.fn().mockRejectedValue(new Error('Database full'));

    await expect(commitStagedMaterial({ create }, staged)).rejects.toThrow(
      'Database full'
    );

    expect(mockFiles.has(staged.stagedUri)).toBe(false);
    expect(
      mockFiles.has(
        'file:///documents/materials/11111111-1111-4111-8111-111111111111.txt'
      )
    ).toBe(false);
  });

  it('deletes an abandoned staged file idempotently', () => {
    const staged = stagedImport();
    addMockFile(staged.stagedUri);

    discardStagedMaterial(staged);
    expect(mockFiles.has(staged.stagedUri)).toBe(false);
    expect(() => discardStagedMaterial(staged)).not.toThrow();
  });

  it('reconciles missing ownership, orphan files, and abandoned stages', async () => {
    const owned = material();
    const missing = material({
      id: '22222222-2222-4222-8222-222222222222',
      localUri:
        'file:///documents/materials/22222222-2222-4222-8222-222222222222.pdf',
      fileType: 'pdf',
    });
    const orphanUri =
      'file:///documents/materials/33333333-3333-4333-8333-333333333333.txt';
    const unrelatedUri = 'file:///documents/materials/readme.keep';
    const stagedUri =
      'file:///cache/material-import-staging/44444444-4444-4444-8444-444444444444.txt';
    addMockFile(owned.localUri);
    addMockFile(orphanUri);
    addMockFile(unrelatedUri);
    addMockFile(stagedUri);
    mockDirectories.add('file:///documents/materials');
    mockDirectories.add('file:///cache/material-import-staging');
    const updateSourceFileState = jest.fn().mockResolvedValue(undefined);

    const result = await reconcileMaterialFileStorage({
      list: jest.fn().mockResolvedValue([owned, missing]),
      updateSourceFileState,
    });

    expect(result.missingMaterialIds).toEqual([missing.id]);
    expect(updateSourceFileState).toHaveBeenCalledWith(missing.id, 'missing');
    expect(mockFiles.has(owned.localUri)).toBe(true);
    expect(mockFiles.has(orphanUri)).toBe(false);
    expect(mockFiles.has(unrelatedUri)).toBe(true);
    expect(mockFiles.has(stagedUri)).toBe(false);
  });

  it('does not delete files when database ownership cannot be listed', async () => {
    const orphanUri =
      'file:///documents/materials/55555555-5555-4555-8555-555555555555.txt';
    addMockFile(orphanUri);
    mockDirectories.add('file:///documents/materials');

    await expect(
      reconcileMaterialFileStorage({
        list: jest.fn().mockRejectedValue(new Error('Database unavailable')),
        updateSourceFileState: jest.fn(),
      })
    ).rejects.toThrow('Database unavailable');

    expect(mockFiles.has(orphanUri)).toBe(true);
  });
});
