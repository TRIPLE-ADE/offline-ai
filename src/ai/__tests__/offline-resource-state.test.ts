const mockListDownloadedFiles = jest.fn();
const mockFetch = jest.fn();
const mockDeleteResources = jest.fn();
const mockReleaseAll = jest.fn();
const mockBeginVerification = jest.fn();
const mockCompleteVerification = jest.fn();
const mockFailVerification = jest.fn();
const mockSaveInstallationState = jest.fn();
const mockSetDownloadState = jest.fn();
let mockResourceDirectoryExists = true;

jest.mock('expo-file-system', () => ({
  Directory: class MockDirectory {
    get exists() {
      return mockResourceDirectoryExists;
    }
  },
  Paths: { document: 'file:///documents/' },
}));

jest.mock(
  'react-native-executorch-expo-resource-fetcher',
  () => ({
    ExpoResourceFetcher: {
      deleteResources: (...sources: unknown[]) =>
        mockDeleteResources(...sources),
      fetch: (
        callback: (progress: number) => void,
        ...sources: unknown[]
      ) => mockFetch(callback, ...sources),
      getFilesTotalSize: jest.fn(),
      listDownloadedFiles: () => mockListDownloadedFiles(),
    },
  }),
  { virtual: true }
);

jest.mock('react-native-executorch', () => ({
  models: {
    llm: {
      gemma4_e2b: () => ({
        modelSource: 'generation-model.pte',
        tokenizerConfigSource: 'generation-tokenizer-config.json',
        tokenizerSource: 'generation-tokenizer.json',
      }),
    },
    text_embedding: {
      all_minilm_l6_v2: () => ({
        modelSource: 'embedding-model.pte',
        tokenizerSource: 'embedding-tokenizer.json',
      }),
    },
  },
  ResourceFetcherUtils: {
    getFilenameFromUri: (source: string) => source,
  },
}));

jest.mock('@/ai/model-installation-state', () => ({
  beginModelResourceVerification: () => mockBeginVerification(),
  completeModelResourceVerification: (installed: boolean) =>
    mockCompleteVerification(installed),
  failModelResourceVerification: (message: string) =>
    mockFailVerification(message),
  saveModelInstallationState: (...args: unknown[]) =>
    mockSaveInstallationState(...args),
  setModelDownloadState: (...args: unknown[]) =>
    mockSetDownloadState(...args),
}));

jest.mock('@/ai/runtime-memory-controller', () => ({
  runtimeMemoryController: {
    releaseAll: () => mockReleaseAll(),
  },
}));

const {
  downloadOfflineResources,
  inspectOfflineResources,
  removeOfflineResources,
} = jest.requireActual<
  typeof import('@/ai/offline-resource-state')
>('@/ai/offline-resource-state');

const allResources = [
  'embedding-model.pte',
  'embedding-tokenizer.json',
  'generation-model.pte',
  'generation-tokenizer.json',
  'generation-tokenizer-config.json',
];

describe('offline resource inspection', () => {
  beforeEach(() => {
    mockResourceDirectoryExists = true;
    mockListDownloadedFiles.mockReset();
    mockFetch.mockReset();
    mockDeleteResources.mockReset();
    mockReleaseAll.mockReset();
    mockBeginVerification.mockReset();
    mockCompleteVerification.mockReset();
    mockFailVerification.mockReset();
    mockSaveInstallationState.mockReset();
    mockSetDownloadState.mockReset();
    mockReleaseAll.mockResolvedValue(undefined);
    mockDeleteResources.mockResolvedValue(undefined);
  });

  it('treats an absent resource directory as verified unavailable', async () => {
    mockResourceDirectoryExists = false;

    await expect(inspectOfflineResources()).resolves.toEqual({
      embeddingInstalled: false,
      generationInstalled: false,
    });
    expect(mockListDownloadedFiles).not.toHaveBeenCalled();
    expect(mockCompleteVerification).toHaveBeenCalledWith(false);
    expect(mockFailVerification).not.toHaveBeenCalled();
  });

  it('publishes available only when every required file is present', async () => {
    mockListDownloadedFiles.mockResolvedValue(allResources);

    await expect(inspectOfflineResources()).resolves.toEqual({
      embeddingInstalled: true,
      generationInstalled: true,
    });
    expect(mockCompleteVerification).toHaveBeenCalledWith(true);
  });

  it('publishes an error instead of pretending an inspection failure means missing files', async () => {
    mockListDownloadedFiles.mockRejectedValue(new Error('Directory read failed'));

    await expect(inspectOfflineResources()).rejects.toThrow(
      'Directory read failed'
    );
    expect(mockCompleteVerification).not.toHaveBeenCalled();
    expect(mockFailVerification).toHaveBeenCalledWith(
      expect.stringContaining('Directory read failed')
    );
  });

  it('shares one in-flight filesystem inspection', async () => {
    let finishInspection: ((files: string[]) => void) | undefined;
    mockListDownloadedFiles.mockImplementation(
      () =>
        new Promise<string[]>((resolve) => {
          finishInspection = resolve;
        })
    );

    const first = inspectOfflineResources();
    const second = inspectOfflineResources();

    expect(second).toBe(first);
    expect(mockListDownloadedFiles).toHaveBeenCalledTimes(1);
    finishInspection?.(allResources);
    await first;
    expect(mockBeginVerification).toHaveBeenCalledTimes(1);
  });

  it('downloads files without loading native model modules', async () => {
    mockFetch.mockImplementation(
      async (onProgress: (progress: number) => void) => {
        onProgress(0.45);
      }
    );
    mockListDownloadedFiles.mockResolvedValue(allResources);

    await expect(downloadOfflineResources()).resolves.toEqual({
      embeddingInstalled: true,
      generationInstalled: true,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(Function),
      ...allResources
    );
    expect(mockSetDownloadState).toHaveBeenCalledWith({
      active: true,
      progress: 0,
    });
    expect(mockSetDownloadState).toHaveBeenCalledWith({ progress: 0.45 });
    expect(mockSetDownloadState).toHaveBeenCalledWith({ progress: 1 });
    expect(mockSetDownloadState).toHaveBeenLastCalledWith({ active: false });
  });

  it('unloads runtimes, deletes resources, and resets persisted state', async () => {
    mockListDownloadedFiles.mockResolvedValue([]);

    await expect(removeOfflineResources()).resolves.toEqual({
      embeddingInstalled: false,
      generationInstalled: false,
    });

    expect(mockReleaseAll).toHaveBeenCalledTimes(1);
    expect(mockDeleteResources).toHaveBeenCalledWith(...allResources);
    expect(mockSaveInstallationState).toHaveBeenCalledWith('not_started');
    expect(mockSetDownloadState).toHaveBeenCalledWith({
      active: false,
      progress: 0,
    });
  });

  it('reconciles partial deletion and keeps the failure retryable', async () => {
    mockDeleteResources.mockRejectedValue(new Error('File is busy'));
    mockListDownloadedFiles.mockResolvedValue([
      'generation-model.pte',
      'generation-tokenizer.json',
      'generation-tokenizer-config.json',
    ]);

    await expect(removeOfflineResources()).rejects.toThrow('File is busy');

    expect(mockCompleteVerification).toHaveBeenCalledWith(false);
    expect(mockSaveInstallationState).toHaveBeenCalledWith(
      'failed',
      expect.stringContaining('could not be removed')
    );
  });
});
