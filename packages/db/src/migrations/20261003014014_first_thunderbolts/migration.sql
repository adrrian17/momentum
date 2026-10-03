CREATE TABLE `note` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_note_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `note_tag` (
	`note_id` text NOT NULL,
	`tag` text NOT NULL,
	CONSTRAINT `note_tag_pk` PRIMARY KEY(`note_id`, `tag`),
	CONSTRAINT `fk_note_tag_note_id_note_id_fk` FOREIGN KEY (`note_id`) REFERENCES `note`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `note_userId_updatedAt_id_idx` ON `note` (`user_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE INDEX `note_tag_tag_idx` ON `note_tag` (`tag`);