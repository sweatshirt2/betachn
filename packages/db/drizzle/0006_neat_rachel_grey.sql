CREATE TABLE "occurrence_proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurrence_id" uuid NOT NULL,
	"key" text NOT NULL,
	"uploaded_by_person_id" uuid,
	"client_uuid" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "occurrence_proofs" ADD CONSTRAINT "occurrence_proofs_occurrence_id_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."occurrences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "occurrence_proofs_occurrence_id_idx" ON "occurrence_proofs" USING btree ("occurrence_id");--> statement-breakpoint
CREATE UNIQUE INDEX "occurrence_proofs_client_uuid_key" ON "occurrence_proofs" USING btree ("client_uuid") WHERE client_uuid is not null;