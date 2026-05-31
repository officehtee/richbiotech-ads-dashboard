CREATE TABLE `bmAdAccountLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bmId` int NOT NULL,
	`adAccountId` int NOT NULL,
	`type` enum('owned','client') NOT NULL DEFAULT 'owned',
	`discoveredAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('active','removed') NOT NULL DEFAULT 'active',
	CONSTRAINT `bmAdAccountLinks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bmDiscoveryLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bmId` int NOT NULL,
	`userId` int NOT NULL,
	`runAt` timestamp NOT NULL DEFAULT (now()),
	`triggerSource` enum('manual','auto','initial') NOT NULL DEFAULT 'manual',
	`foundCount` int DEFAULT 0,
	`addedCount` int DEFAULT 0,
	`linkedCount` int DEFAULT 0,
	`removedCount` int DEFAULT 0,
	`status` enum('success','partial','failed') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`durationMs` int,
	CONSTRAINT `bmDiscoveryLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `businessManagers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bmId` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`accountGroupId` int NOT NULL,
	`accessTokenEncrypted` text NOT NULL,
	`tokenExpiresAt` timestamp,
	`lastSyncAt` timestamp,
	`status` enum('active','token_expired','blocked','revoked') NOT NULL DEFAULT 'active',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businessManagers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `adAccounts` ADD `bmId` int;--> statement-breakpoint
ALTER TABLE `adAccounts` ADD `discoveredAt` timestamp;