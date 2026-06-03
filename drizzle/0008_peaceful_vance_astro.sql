ALTER TABLE `adInsightsDaily` ADD `reach` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `adInsightsDaily` ADD `costPerMessage` double;--> statement-breakpoint
ALTER TABLE `adInsightsDaily` ADD `purchaseRoas` double;