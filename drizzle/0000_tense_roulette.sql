CREATE TABLE `scores` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`mode` text NOT NULL,
	`name` text NOT NULL,
	`score` integer NOT NULL,
	`wave` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_scores_mode_rank` ON `scores` (`mode`,`score`,`created_at`,`id`);