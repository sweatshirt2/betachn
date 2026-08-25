import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './models';
import { dbEnv } from './env';

export const pool = new Pool({
  connectionString: dbEnv.DATABASE_URL,
  max: 10,
});

export const db = drizzle({ client: pool, schema });

export type Database = typeof db;
