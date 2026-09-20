import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client';
import { runDataBackfills } from './data-migrations';

try {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('migrations applied');
  await runDataBackfills(db);
} catch (err) {
  console.error('migration failed:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
