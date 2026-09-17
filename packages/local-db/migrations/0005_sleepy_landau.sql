CREATE TABLE `recurring_shopping_items` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`supply_id` text,
	`interval_days` integer NOT NULL,
	`quantity_text` text,
	`note` text,
	`last_purchase_at` text,
	`snoozed_until` text,
	`state` text DEFAULT 'active' NOT NULL,
	`archived_at` text,
	`created_by_person_id` text,
	`client_uuid` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supply_id`) REFERENCES `supplies`(`id`) ON UPDATE no action ON DELETE no action
);
