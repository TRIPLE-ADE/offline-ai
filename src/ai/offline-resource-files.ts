export function resourceFilename(path: string) {
  return path.split('/').pop()?.split('?')[0] ?? path;
}

export function hasEveryDownloadedResource(
  downloadedPaths: string[],
  resourceSources: string[],
  getStoredFilename: (source: string) => string
) {
  const downloadedNames = new Set(downloadedPaths.map(resourceFilename));
  return resourceSources.every((source) =>
    downloadedNames.has(getStoredFilename(source))
  );
}
