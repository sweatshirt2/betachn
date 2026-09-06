import { z } from 'zod';

/**
 * Web-route environment (plan §4.16). DATABASE_URL fail-fasts inside
 * `@chorify/db` at import; Google credentials are optional until the
 * /auth/google route is enabled, then required as a pair.
 */
const webEnvSchema = z
  .object({
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  })
  .refine((env) => Boolean(env.GOOGLE_CLIENT_ID) === Boolean(env.GOOGLE_CLIENT_SECRET), {
    message: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together',
  });

export type WebEnv = z.infer<typeof webEnvSchema>;

let cached: WebEnv | null = null;

export function readWebEnv(env: NodeJS.ProcessEnv = process.env): WebEnv {
  if (cached) return cached;
  const parsed = webEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Invalid web environment — ${parsed.error.issues.map((i) => i.message).join('; ')}. See .env.example.`,
    );
  }
  cached = parsed.data;
  return cached;
}

export function getGoogleConfig(): { clientId: string; clientSecret: string } | null {
  const env = readWebEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
}
