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

export type TopicStatus =
  | 'not_started'
  | 'learning'
  | 'needs_review'
  | 'completed';

export type Topic = {
  id: string;
  materialId: string;
  position: number;
  title: string;
  summary: string;
  sourceChunkIds: string[];
  status: TopicStatus;
  bestScore: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTopicInput = Pick<
  Topic,
  'id' | 'materialId' | 'position' | 'title' | 'summary' | 'sourceChunkIds'
>;

export type GeneratedArtifactKind = 'topic_map' | 'lesson' | 'quiz';

export type GeneratedArtifact = {
  id: string;
  materialId: string;
  topicId: string | null;
  kind: GeneratedArtifactKind;
  payloadJson: string;
  promptVersion: string;
  modelVersion: string;
  createdAt: string;
  updatedAt: string;
};

export type QuizAttempt = {
  id: string;
  topicId: string;
  answers: number[];
  score: number;
  createdAt: string;
};

export type ChatMessageRole = 'user' | 'assistant' | 'system';
export type ChatMessageStatus = 'pending' | 'complete' | 'failed' | 'interrupted';

export type StoredCitation = {
  chunkId: string;
  label: string;
  excerpt: string;
  pageStart: number | null;
  pageEnd: number | null;
};

export type ChatThread = {
  id: string;
  materialId: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  role: ChatMessageRole;
  content: string;
  citations: StoredCitation[];
  status: ChatMessageStatus;
  createdAt: string;
};
