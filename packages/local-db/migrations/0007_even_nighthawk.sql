PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_responsibilities` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`routine_id` text,
	`room_id` text,
	`archived_at` text,
	`created_by_person_id` text,
	`icon` text DEFAULT 'pin' NOT NULL,
	`proof_mode` text DEFAULT 'optional' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_responsibilities`("id", "household_id", "title", "notes", "routine_id", "room_id", "archived_at", "created_by_person_id", "icon", "proof_mode", "created_at") SELECT "id", "household_id", "title", "notes", "routine_id", "room_id", "archived_at", "created_by_person_id", "icon", "proof_mode", "created_at" FROM `responsibilities`;--> statement-breakpoint
DROP TABLE `responsibilities`;--> statement-breakpoint
ALTER TABLE `__new_responsibilities` RENAME TO `responsibilities`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_routines` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT 'sun' NOT NULL,
	`time_bucket` text DEFAULT 'anytime' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_routines`("id", "household_id", "name", "icon", "time_bucket", "created_at") SELECT "id", "household_id", "name", "icon", "time_bucket", "created_at" FROM `routines`;--> statement-breakpoint
DROP TABLE `routines`;--> statement-breakpoint
ALTER TABLE `__new_routines` RENAME TO `routines`;--> statement-breakpoint
CREATE TABLE `__new_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`room_id` text,
	`name` text NOT NULL,
	`icon` text DEFAULT 'wrench' NOT NULL,
	`maintenance_interval_days` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_assets`("id", "household_id", "room_id", "name", "icon", "maintenance_interval_days", "created_at") SELECT "id", "household_id", "room_id", "name", "icon", "maintenance_interval_days", "created_at" FROM `assets`;--> statement-breakpoint
DROP TABLE `assets`;--> statement-breakpoint
ALTER TABLE `__new_assets` RENAME TO `assets`;--> statement-breakpoint
CREATE TABLE `__new_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT 'door' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_rooms`("id", "household_id", "name", "icon", "created_at") SELECT "id", "household_id", "name", "icon", "created_at" FROM `rooms`;--> statement-breakpoint
DROP TABLE `rooms`;--> statement-breakpoint
ALTER TABLE `__new_rooms` RENAME TO `rooms`;