CREATE TABLE `device_sync_state` (
	`id` text PRIMARY KEY NOT NULL,
	`cursor` text DEFAULT '0' NOT NULL,
	`last_successful_sync_at` text,
	`bootstrap_at` text
);
--> statement-breakpoint
CREATE TABLE `pending_ops` (
	`uuid` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`op` text NOT NULL,
	`payload` text NOT NULL,
	`audience_type` text NOT NULL,
	`audience_ids` text NOT NULL,
	`domain` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`currency` text DEFAULT 'ETB' NOT NULL,
	`timezone` text DEFAULT 'Africa/Addis_Ababa' NOT NULL,
	`synced_at` text,
	`last_export_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`sex` text,
	`birth_date` text,
	`age` integer,
	`avatar_emoji` text DEFAULT '🙂' NOT NULL,
	`role_id` text,
	`permission_overrides` text DEFAULT '{}' NOT NULL,
	`phone` text,
	`language` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text,
	`password_hash` text,
	`phone` text,
	`person_id` text,
	`household_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`builtin_key` text,
	`name` text NOT NULL,
	`description` text,
	`is_owner_role` integer DEFAULT false NOT NULL,
	`is_builtin` integer NOT NULL,
	`permissions` text NOT NULL,
	`default_permissions` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `assignment_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`responsibility_id` text NOT NULL,
	`pattern` text NOT NULL,
	`interval` integer,
	`days_of_week` text,
	`anchor_date` text,
	`month_day` integer,
	`dates` text,
	`start_date` text NOT NULL,
	`end_date` text,
	`rotation` text,
	`person_ids` text DEFAULT '[]' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_by_person_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`responsibility_id`) REFERENCES `responsibilities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`responsibility_id` text NOT NULL,
	`rule_id` text NOT NULL,
	`due_date` text NOT NULL,
	`person_ids` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`completed_by_person_id` text,
	`completed_at` text,
	`note` text,
	`proof_path` text,
	`skip_reason` text,
	`subtask_states` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`responsibility_id`) REFERENCES `responsibilities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rule_id`) REFERENCES `assignment_rules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`completed_by_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `occurrences_rule_due_key` ON `occurrences` (`rule_id`,`due_date`);--> statement-breakpoint
CREATE TABLE `responsibilities` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`routine_id` text,
	`room_id` text,
	`archived_at` text,
	`created_by_person_id` text,
	`icon` text DEFAULT '📌' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT '🌅' NOT NULL,
	`time_bucket` text DEFAULT 'anytime' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `subtasks` (
	`id` text PRIMARY KEY NOT NULL,
	`responsibility_id` text NOT NULL,
	`title` text NOT NULL,
	`sort_order` integer NOT NULL,
	`assignee_person_id` text,
	FOREIGN KEY (`responsibility_id`) REFERENCES `responsibilities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignee_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`room_id` text,
	`name` text NOT NULL,
	`icon` text DEFAULT '🔧' NOT NULL,
	`maintenance_interval_days` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT '🏠' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `service_records` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`serviced_on` text NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shopping_items` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity_text` text,
	`category` text,
	`source_supply_id` text,
	`purchased_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_supply_id`) REFERENCES `supplies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `supplies` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`state` text DEFAULT 'available' NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `activity_events` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`actor_person_id` text,
	`type` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`domain` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notification_prefs` (
	`person_id` text PRIMARY KEY NOT NULL,
	`categories` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`recipient_person_id` text NOT NULL,
	`category` text NOT NULL,
	`type` text NOT NULL,
	`params_json` text DEFAULT '{}' NOT NULL,
	`link_path` text,
	`read_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
