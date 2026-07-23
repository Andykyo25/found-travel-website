CREATE TABLE `site_content` (
	`id` integer PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text
);
--> statement-breakpoint
CREATE TABLE `site_editors` (
	`email` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
