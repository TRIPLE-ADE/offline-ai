export type MaterialStatus =
  | 'imported'
  | 'extracting'
  | 'chunking'
  | 'indexing'
  | 'generating_topics'
  | 'ready'
  | 'failed';

export type MaterialFileType = 'txt' | 'pdf';

export type Material = {
  id: string;
  title: string;
  sourceUri: string;
  localUri: string;
  fileType: MaterialFileType;
  fileSize: number | null;
  status: MaterialStatus;
  statusMessage: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateMaterialInput = Pick<
  Material,
  'id' | 'title' | 'sourceUri' | 'localUri' | 'fileType' | 'fileSize'
>;

export type MaterialChunk = {
  id: string;
  materialId: string;
  ordinal: number;
  content: string;
  pageStart: number | null;
  pageEnd: number | null;
  sectionTitle: string | null;
  contentHash: string;
  indexedAt: string | null;
};

export type CreateMaterialChunkInput = Omit<MaterialChunk, 'indexedAt'>;
