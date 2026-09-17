import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { occurrences } from './scheduling.model';

/**
 * Proof photos (§4A.2 / D106) — MULTIPLE per completion. Row-level LWW in
 * sync; the blob lives in object storage (StoragePort), the row is the
 * binding. `clientUuid` = sync idempotency (client uuid IS the idempotency
 * key, D59). The reserved singular `occurrences.proofPath` column stays
 * formally reserved/unused (v1 law — "no image uploads" referred to BLOBS in
 * the DB, not bound keys).
 */
export const occurrenceProofs = pgTable(
  'occurrence_proofs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    occurrenceId: uuid('occurrence_id')
      .notNull()
      .references(() => occurrences.id),
    key: text('key').notNull(),
    uploadedByPersonId: uuid('uploaded_by_person_id'),
    clientUuid: text('client_uuid'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('occurrence_proofs_occurrence_id_idx').on(t.occurrenceId),
    uniqueIndex('occurrence_proofs_client_uuid_key').on(t.clientUuid).where(sql`client_uuid is not null`),
  ],
);

export type OccurrenceProof = typeof occurrenceProofs.$inferSelect;
