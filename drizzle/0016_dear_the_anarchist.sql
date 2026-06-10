CREATE TABLE `adStatus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountId` int NOT NULL,
	`adId` varchar(64) NOT NULL,
	`campaignId` varchar(64),
	`effectiveStatus` varchar(64),
	`issuesJson` text,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adStatus_id` PRIMARY KEY(`id`),
	CONSTRAINT `adStatus_userId_adId_unique` UNIQUE(`userId`,`adId`)
);
--> statement-breakpoint
CREATE INDEX `adStatus_userId_campaignId_idx` ON `adStatus` (`userId`,`campaignId`);--> statement-breakpoint
CREATE INDEX `adStatus_accountId_idx` ON `adStatus` (`accountId`);