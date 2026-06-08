ALTER TABLE `inviteTokens` MODIFY COLUMN `role` enum('ceo','supervisor','content','staff') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','owner','ceo','supervisor','content','staff','pending','user') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `users` ADD `nickname` varchar(255);