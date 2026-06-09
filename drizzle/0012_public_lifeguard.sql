ALTER TABLE `syncLogs` MODIFY COLUMN `jobType` enum('adInsights','bm','alerts','tokenCheck') NOT NULL DEFAULT 'adInsights';--> statement-breakpoint
ALTER TABLE `adInsightsDaily` ADD `postType` enum('main','support');--> statement-breakpoint
ALTER TABLE `campaignStatus` ADD `quality` enum('angel','rising','testing','tested');