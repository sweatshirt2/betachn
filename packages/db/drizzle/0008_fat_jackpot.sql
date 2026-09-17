CREATE TABLE "recurring_shopping_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"supply_id" uuid,
	"interval_days" integer NOT NULL,
	"quantity_text" text,
	"note" text,
	"last_purchase_at" timestamp with time zone,
	"snoozed_until" timestamp with time zone,
	"state" text DEFAULT 'active' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_by_person_id" uuid,
	"client_uuid" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recurring_shopping_items" ADD CONSTRAINT "recurring_shopping_items_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_shopping_items" ADD CONSTRAINT "recurring_shopping_items_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_shopping_items_household_id_idx" ON "recurring_shopping_items" USING btree ("household_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_shopping_items_client_uuid_key" ON "recurring_shopping_items" USING btree ("client_uuid") WHERE client_uuid is not null;