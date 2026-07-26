import { DATABASE_VERSION, INITIAL_SCHEMA_SQL } from '@/db/schema';

describe('initial database schema', () => {
  it('contains every Stage 2 persistence boundary', () => {
    const requiredTables = [
      'materials',
      'material_chunks',
      'topics',
      'generated_artifacts',
      'quiz_attempts',
      'chat_threads',
      'chat_messages',
    ];

    for (const table of requiredTables) {
      expect(INITIAL_SCHEMA_SQL).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  it('starts from migration version one', () => {
    expect(DATABASE_VERSION).toBe(1);
  });
});
