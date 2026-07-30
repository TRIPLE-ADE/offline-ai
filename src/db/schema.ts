export const DATABASE_VERSION = 1;

export const INITIAL_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    source_uri TEXT NOT NULL,
    local_uri TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('txt', 'pdf')),
    file_size INTEGER,
    source_file_state TEXT NOT NULL DEFAULT 'available' CHECK (
      source_file_state IN ('available', 'missing')
    ),
    status TEXT NOT NULL CHECK (
      status IN (
        'imported',
        'extracting',
        'chunking',
        'indexing',
        'generating_topics',
        'ready',
        'failed'
      )
    ),
    status_message TEXT,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS material_chunks (
    id TEXT PRIMARY KEY NOT NULL,
    material_id TEXT NOT NULL,
    ordinal INTEGER NOT NULL,
    content TEXT NOT NULL,
    page_start INTEGER,
    page_end INTEGER,
    section_title TEXT,
    content_hash TEXT NOT NULL,
    indexed_at TEXT,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    UNIQUE (material_id, ordinal),
    UNIQUE (material_id, content_hash)
  );

  CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY NOT NULL,
    material_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    source_chunk_ids_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK (
      status IN ('not_started', 'learning', 'needs_review', 'completed')
    ),
    best_score REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    UNIQUE (material_id, position)
  );

  CREATE TABLE IF NOT EXISTS generated_artifacts (
    id TEXT PRIMARY KEY NOT NULL,
    material_id TEXT NOT NULL,
    topic_id TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('topic_map', 'lesson', 'quiz')),
    payload_json TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    model_version TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id TEXT PRIMARY KEY NOT NULL,
    topic_id TEXT NOT NULL,
    answers_json TEXT NOT NULL,
    score REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chat_threads (
    id TEXT PRIMARY KEY NOT NULL,
    material_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY NOT NULL,
    thread_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    citations_json TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'complete', 'failed', 'interrupted')),
    created_at TEXT NOT NULL,
    FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_materials_updated_at
    ON materials(updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_chunks_material_ordinal
    ON material_chunks(material_id, ordinal);
  CREATE INDEX IF NOT EXISTS idx_topics_material_position
    ON topics(material_id, position);
  CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created
    ON chat_messages(thread_id, created_at);
`;
