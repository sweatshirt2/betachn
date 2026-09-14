CREATE TABLE "supply_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"actor_person_id" uuid,
	"type" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"quantity_text" text,
	"note" text,
	"client_uuid" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supply_events" ADD CONSTRAINT "supply_events_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_events" ADD CONSTRAINT "supply_events_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "supply_events_household_id_idx" ON "supply_events" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "supply_events_supply_id_idx" ON "supply_events" USING btree ("supply_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supply_events_client_uuid_key" ON "supply_events" USING btree ("client_uuid") WHERE client_uuid is not null;