import {
  hasEveryDownloadedResource,
  resourceFilename,
} from '@/ai/offline-resource-files';

const getStoredFilename = (source: string) =>
  source
    .replace(/^https?:\/\//, '')
    .split('#')[0]
    .replace(/[^a-zA-Z0-9._-]/g, '_');

describe('offline resource file matching', () => {
  const sources = [
    'https://huggingface.co/example/model/resolve/main/model.pte',
    'https://huggingface.co/example/model/resolve/main/tokenizer.json',
  ];
  const downloaded = sources.map(
    (source) => `file:///documents/rne/${getStoredFilename(source)}`
  );

  it('matches downloaded resources using the fetcher storage filename', () => {
    expect(
      hasEveryDownloadedResource(downloaded, sources, getStoredFilename)
    ).toBe(true);
  });

  it('does not mistake an unrelated tokenizer with the same basename for a resource', () => {
    const unrelatedTokenizer =
      'file:///documents/rne/huggingface.co_other_model_tokenizer.json';

    expect(
      hasEveryDownloadedResource(
        [downloaded[0], unrelatedTokenizer],
        sources,
        getStoredFilename
      )
    ).toBe(false);
  });

  it('extracts the stored filename from a downloaded file URI', () => {
    expect(resourceFilename(downloaded[0])).toBe(getStoredFilename(sources[0]));
  });
});
