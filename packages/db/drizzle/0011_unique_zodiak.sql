CREATE TABLE "occurrence_swaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"occurrence_id" uuid NOT NULL,
	"from_person_id" uuid NOT NULL,
	"to_person_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"client_uuid" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "occurrence_swaps" ADD CONSTRAINT "occurrence_swaps_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrence_swaps" ADD CONSTRAINT "occurrence_swaps_occurrence_id_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."occurrences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrence_swaps" ADD CONSTRAINT "occurrence_swaps_from_person_id_people_id_fk" FOREIGN KEY ("from_person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrence_swaps" ADD CONSTRAINT "occurrence_swaps_to_person_id_people_id_fk" FOREIGN KEY ("to_person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "occurrence_swaps_occurrence_idx" ON "occurrence_swaps" USING btree ("occurrence_id");--> statement-breakpoint
CREATE INDEX "occurrence_swaps_to_pending_idx" ON "occurrence_swaps" USING btree ("to_person_id") WHERE status = 'pending';