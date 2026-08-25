import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client';

try {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('migrations applied');
} catch (err) {
  console.error('migration failed:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
