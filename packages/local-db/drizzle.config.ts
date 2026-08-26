import type { Config } from 'drizzle-kit';

/** Device-side SQLite migration track — fully separate from packages/db pg. */
export default {
  dialect: 'sqlite',
  schema: './src/schema/index.ts',
  out: './migrations',
} satisfies Config;
