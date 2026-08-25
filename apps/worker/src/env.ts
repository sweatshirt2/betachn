import { z } from 'zod';
import { loadRepoEnv } from '@chorify/db';

loadRepoEnv();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  WORKER_ADMIN_TOKEN: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4001),
});

export type WorkerEnv = z.infer<typeof envSchema>;

/** Fail-fast boot validation: DATABASE_URL + WORKER_ADMIN_TOKEN are required. */
export function readWorkerEnv(env: NodeJS.ProcessEnv = process.env): WorkerEnv {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment variables — ${detail}. See .env.example.`);
  }
  return parsed.data;
}
