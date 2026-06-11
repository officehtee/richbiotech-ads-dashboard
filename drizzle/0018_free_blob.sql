ALTER TABLE `adAccounts` ADD `mergedAt` timestamp;--> statement-breakpoint
ALTER TABLE `adAccounts` ADD `standaloneAccessToken` text;--> statement-breakpoint
ALTER TABLE `adAccounts` ADD `autoReactivatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `businessManagers` ADD `syncFailStreak` int DEFAULT 0 NOT NULL;