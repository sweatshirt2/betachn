CREATE TABLE `supply_events` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`supply_id` text NOT NULL,
	`actor_person_id` text,
	`type` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`quantity_text` text,
	`note` text,
	`client_uuid` text,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supply_id`) REFERENCES `supplies`(`id`) ON UPDATE no action ON DELETE no action
);
