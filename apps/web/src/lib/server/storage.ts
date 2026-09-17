import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { StoragePort } from '@chorify/core';

/**
 * Binary-object environment (§4A.2 / D104): S3-compatible storage driven by
 * env alone (AWS, R2, or MinIO all by endpoint/region/bucket/keys). The
 * dev-only local-folder fallback (`.data/`, gitignored) engages ONLY when no
 * S3 env is present AND NODE_ENV !== 'production' — a production boot
 * without storage env fail-fasts here at import, per the §4.16 law.
 */
const storageEnvSchema = z
  .object({
    S3_ENDPOINT: z.string().min(1).optional(),
    S3_REGION: z.string().min(1).optional(),
    S3_BUCKET: z.string().min(1).optional(),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  })
  .refine(
    (env) =>
      // All-or-nothing: a partial S3 config is a typo, not a mode.
      (env.S3_BUCKET !== undefined) ===
      (env.S3_ACCESS_KEY_ID !== undefined && env.S3_SECRET_ACCESS_KEY !== undefined),
    { message: 'S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be set together' },
  );

export type StorageMode = 's3' | 'local-dev';

function readStorageEnv(): z.infer<typeof storageEnvSchema> {
  const parsed = storageEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid storage environment — ${parsed.error.issues.map((i) => i.message).join('; ')}. See .env.example.`,
    );
  }
  return parsed.data;
}

/** Resolved once at first use; import stays side-effect-free for tests. */
let cached: { mode: StorageMode; port: StoragePort } | null = null;

export function getStorage(): { mode: StorageMode; port: StoragePort } {
  if (cached) return cached;
  const env = readStorageEnv();
  const isProduction = process.env.NODE_ENV === 'production';

  if (env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) {
    const client = new S3Client({
      region: env.S3_REGION ?? 'auto',
      // Endpoint omitting = real AWS; setting it targets R2/MinIO.
      ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      // R2/MinIO need path-style; AWS ignores the flag harmlessly on
      // virtual-hosted endpoints set explicitly.
      forcePathStyle: Boolean(env.S3_ENDPOINT),
    });
    const bucket = env.S3_BUCKET;
    cached = {
      mode: 's3',
      port: {
        async put(key, bytes, contentType) {
          await client.send(
            new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: contentType }),
          );
        },
        async get(key) {
          try {
            const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
            if (!res.Body) return null;
            const bytes = new Uint8Array(await res.Body.transformToByteArray());
            return { bytes, contentType: res.ContentType ?? 'image/jpeg' };
          } catch (error) {
            const name = (error as { name?: string }).name;
            if (name === 'NoSuchKey' || name === '404') return null;
            throw error;
          }
        },
        async remove(key) {
          // Idempotent by S3 semantics — deleting a missing key succeeds.
          await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        },
      },
    };
    return cached;
  }

  if (isProduction) {
    throw new Error(
      'Storage environment missing — set S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY (plus S3_ENDPOINT for R2/MinIO) in production. See .env.example.',
    );
  }

  // Dev-only local folder fallback (gitignored `.data/` at repo root).
  const root = resolve(process.cwd(), '../../.data/storage');
  cached = {
    mode: 'local-dev',
    port: {
      async put(key, bytes, contentType) {
        const target = join(root, key);
        await mkdir(join(target, '..'), { recursive: true });
        await writeFile(target, bytes);
        await writeFile(`${target}.type`, contentType);
      },
      async get(key) {
        try {
          const bytes = new Uint8Array(await readFile(join(root, key)));
          const contentType = await readFile(`${join(root, key)}.type`, 'utf8').catch(
            () => 'image/jpeg',
          );
          return { bytes, contentType };
        } catch {
          return null;
        }
      },
      async remove(key) {
        await rm(join(root, key), { force: true });
        await rm(`${join(root, key)}.type`, { force: true });
      },
    },
  };
  return cached;
}

/** Object-key builder (§4A.2): household-scoped, per-occurrence, uuid-suffixed. */
export function proofKey(householdId: string, occurrenceId: string, uuid: string): string {
  return `hh/${householdId}/proof/${occurrenceId}/${uuid}.jpg`;
}
