CREATE TABLE `syncLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobType` enum('adInsights','bm','alerts') NOT NULL DEFAULT 'adInsights',
	`runAt` timestamp NOT NULL DEFAULT (now()),
	`tenants` int NOT NULL DEFAULT 0,
	`newAccounts` int NOT NULL DEFAULT 0,
	`existingAccounts` int NOT NULL DEFAULT 0,
	`rowsSynced` int NOT NULL DEFAULT 0,
	`previewsRefreshed` int NOT NULL DEFAULT 0,
	`failed` int NOT NULL DEFAULT 0,
	`durationMs` int NOT NULL DEFAULT 0,
	`status` enum('success','partial','failed') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	CONSTRAINT `syncLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `syncLogs_jobType_idx` ON `syncLogs` (`jobType`);--> statement-breakpoint
CREATE INDEX `syncLogs_runAt_idx` ON `syncLogs` (`runAt`);