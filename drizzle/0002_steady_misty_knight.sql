CREATE TABLE `alertChannels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`channelType` enum('web','line','webhook','email','manus_owner') NOT NULL,
	`label` varchar(255),
	`configJson` text NOT NULL,
	`isEnabled` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alertChannels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alertEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ruleId` int,
	`ruleType` varchar(64) NOT NULL,
	`severity` enum('info','warning','critical') DEFAULT 'warning',
	`title` varchar(500) NOT NULL,
	`message` text NOT NULL,
	`contextJson` text,
	`isRead` boolean DEFAULT false,
	`dedupeKey` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alertEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alertRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ruleType` enum('roas_below','spend_no_purchase','cost_per_msg_above','ctr_drop_pct','spend_spike_pct') NOT NULL,
	`label` varchar(255) NOT NULL,
	`isEnabled` boolean DEFAULT true,
	`paramJson` text NOT NULL,
	`severity` enum('info','warning','critical') DEFAULT 'warning',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alertRules_id` PRIMARY KEY(`id`)
);
