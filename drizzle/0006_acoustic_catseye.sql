ALTER TABLE `adInsightsDaily` ADD `metaOrders` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `adInsightsDaily` ADD `metaSalesAmount` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `adInsightsDaily` ADD CONSTRAINT `adInsightsDaily_adId_date_unique` UNIQUE(`adId`,`date`);--> statement-breakpoint
ALTER TABLE `adManualMetrics` ADD CONSTRAINT `adManualMetrics_adId_date_unique` UNIQUE(`adId`,`date`);--> statement-breakpoint
CREATE INDEX `adInsightsDaily_userId_date_idx` ON `adInsightsDaily` (`userId`,`date`);--> statement-breakpoint
CREATE INDEX `adInsightsDaily_accountId_date_idx` ON `adInsightsDaily` (`accountId`,`date`);--> statement-breakpoint
CREATE INDEX `adManualMetrics_userId_date_idx` ON `adManualMetrics` (`userId`,`date`);