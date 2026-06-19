CREATE TABLE `notificationPrefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`masterEnabled` boolean NOT NULL DEFAULT false,
	`syncSuccess` boolean NOT NULL DEFAULT false,
	`syncFailed` boolean NOT NULL DEFAULT true,
	`tokenIssue` boolean NOT NULL DEFAULT true,
	`alertCritical` boolean NOT NULL DEFAULT true,
	`alertWarning` boolean NOT NULL DEFAULT true,
	`alertInfo` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationPrefs_id` PRIMARY KEY(`id`),
	CONSTRAINT `notificationPrefs_userId_unique` UNIQUE(`userId`)
);
