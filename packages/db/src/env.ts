import { join } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

/** Loads the repo-root .env (gitignored); no-op when the file is absent. */
export function loadRepoEnv(): void {
  loadDotenv({ path: join(import.meta.dirname, '../../../.env') });
}

loadRepoEnv();

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL must be a PostgreSQL connection string'),
});

export type DbEnv = z.infer<typeof envSchema>;

/** Parses and validates the environment at boot; throws (fail-fast) when invalid. */
export function readDbEnv(env: NodeJS.ProcessEnv = process.env): DbEnv {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment variables — ${detail}. See .env.example.`);
  }
  return parsed.data;
}

/** Validated once at module load: importing the db client fails fast on a bad environment. */
export const dbEnv = readDbEnv();
