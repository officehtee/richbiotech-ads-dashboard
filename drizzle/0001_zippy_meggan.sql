CREATE TABLE `accountGroupMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`accountId` int NOT NULL,
	`phaseName` varchar(255),
	CONSTRAINT `accountGroupMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `accountGroups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`groupName` varchar(255) NOT NULL,
	`color` varchar(32) DEFAULT '#3b82f6',
	`roasTarget` double DEFAULT 2,
	`roasThreshold` double DEFAULT 1.5,
	`ctrThreshold` double DEFAULT 1,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `accountGroups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `adAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`adAccountId` varchar(64) NOT NULL,
	`accessToken` text NOT NULL,
	`accountName` varchar(255),
	`nickname` varchar(255),
	`pageName` varchar(255),
	`phaseName` varchar(255),
	`roasTarget` double DEFAULT 2,
	`isActive` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adAccounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commissionClipAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clipNumber` varchar(50) NOT NULL,
	`groupId` int,
	`staffId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commissionClipAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commissionClipGrades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clipNumber` varchar(50) NOT NULL,
	`groupId` int,
	`gradeId` int,
	`periodKey` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commissionClipGrades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commissionGrades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`gradeName` varchar(50) NOT NULL,
	`amount` double NOT NULL,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commissionGrades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commissionLocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`periodKey` varchar(10) NOT NULL,
	`periodLabel` varchar(100),
	`snapshotJson` text NOT NULL,
	`lockedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commissionLocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commissionStaff` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`linkedUserId` int,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commissionStaff_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scaleLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`groupId` int,
	`accountId` int,
	`adsetId` varchar(64),
	`adsetName` varchar(500),
	`phaseName` varchar(255),
	`budgetScaled` double,
	`spendAll` double,
	`status` enum('active','closed') DEFAULT 'active',
	`notes` text,
	`scaledAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scaleLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scaleSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`increaseSmallPercent` double DEFAULT 20,
	`increaseLargePercent` double DEFAULT 50,
	`decreaseSmallPercent` double DEFAULT 20,
	`decreaseLargePercent` double DEFAULT 30,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scaleSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `scaleSettings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `shareLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`label` varchar(255),
	`accountFilter` text NOT NULL,
	`defaultDateRange` varchar(16) DEFAULT '7d',
	`isActive` boolean DEFAULT true,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shareLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `shareLinks_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','owner','ceo','content','staff','pending','user') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `users` ADD `ownerId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `companyCode` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `companyName` varchar(255);