CREATE TABLE `occurrence_swaps` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`occurrence_id` text NOT NULL,
	`from_person_id` text NOT NULL,
	`to_person_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`client_uuid` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`occurrence_id`) REFERENCES `occurrences`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
