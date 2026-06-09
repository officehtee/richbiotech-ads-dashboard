ALTER TABLE `adAccounts` ADD `ownerUserId` int;--> statement-breakpoint
ALTER TABLE `adAccounts` ADD `paymentType` enum('card','prepaid');--> statement-breakpoint
ALTER TABLE `adAccounts` ADD `limitAmount` int;--> statement-breakpoint
ALTER TABLE `adAccounts` ADD `tokenStatus` enum('active','token_expired','blocked','revoked') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `businessManagers` ADD `defaultOwnerUserId` int;