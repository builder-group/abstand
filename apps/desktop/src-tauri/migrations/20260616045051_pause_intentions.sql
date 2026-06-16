-- Add column "paused_at" to table: "intention"
ALTER TABLE `intention` ADD COLUMN `paused_at` integer NULL;
-- Add column "resumed_at" to table: "intention"
ALTER TABLE `intention` ADD COLUMN `resumed_at` integer NULL;
