CREATE TABLE `campaignStatus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountId` int NOT NULL,
	`campaignId` varchar(64) NOT NULL,
	`campaignName` varchar(512),
	`effectiveStatus` varchar(64),
	`approvedAt` varchar(10),
	`rejectedAt` varchar(10),
	`rejectedExpired` boolean NOT NULL DEFAULT false,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaignStatus_id` PRIMARY KEY(`id`),
	CONSTRAINT `campaignStatus_userId_campaignId_unique` UNIQUE(`userId`,`campaignId`)
);
--> statement-breakpoint
CREATE INDEX `campaignStatus_userId_idx` ON `campaignStatus` (`userId`);--> statement-breakpoint
CREATE INDEX `campaignStatus_accountId_idx` ON `campaignStatus` (`accountId`);