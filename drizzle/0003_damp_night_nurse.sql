CREATE TABLE `inviteTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`ownerId` int NOT NULL,
	`role` enum('ceo','content','staff') NOT NULL,
	`label` varchar(255),
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`usedByUserId` int,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inviteTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `inviteTokens_token_unique` UNIQUE(`token`)
);
