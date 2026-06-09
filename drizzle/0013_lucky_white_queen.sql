ALTER TABLE `campaignStatus` ADD `trashedAt` timestamp;--> statement-breakpoint
ALTER TABLE `campaignStatus` ADD `trashedReason` enum('auto_reject','manual');--> statement-breakpoint
ALTER TABLE `campaignStatus` ADD `restoredAt` timestamp;