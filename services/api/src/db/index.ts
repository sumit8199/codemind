import { IDatabaseAdapter } from './db-interface.js';
import { PostgresDatabaseAdapter } from './postgres-adapter.js';
import { MemoryDatabaseAdapter } from './memory-adapter.js';
import { config } from '../config.js';

let dbInstance: IDatabaseAdapter;

export async function getDatabase(): Promise<IDatabaseAdapter> {
  if (dbInstance) return dbInstance;

  // Attempt Postgres connection if DATABASE_URL is configured
  if (config.DATABASE_URL && !process.env.FORCE_MEMORY_DB) {
    try {
      const pgAdapter = new PostgresDatabaseAdapter(config.DATABASE_URL);
      await pgAdapter.init();
      console.log('✓ Successfully connected to PostgreSQL database and verified migrations.');
      dbInstance = pgAdapter;
      return dbInstance;
    } catch (err: any) {
      console.warn(`! PostgreSQL unavailable (${err?.message || err}). Falling back to In-Memory DB adapter for local/test execution.`);
    }
  }

  const memAdapter = new MemoryDatabaseAdapter();
  await memAdapter.init();
  console.log('✓ In-Memory DB adapter initialized.');
  dbInstance = memAdapter;
  return dbInstance;
}
