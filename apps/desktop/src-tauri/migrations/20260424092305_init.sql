-- Create "app" table
CREATE TABLE `app` (
  `id` integer NULL PRIMARY KEY AUTOINCREMENT,
  `bundle_id` text NOT NULL,
  `name` text NOT NULL,
  `icon` text NULL,
  `color` text NULL,
  `created_at` integer NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);
-- Create index "app_bundle_id" to table: "app"
CREATE UNIQUE INDEX `app_bundle_id` ON `app` (`bundle_id`);
-- Create "website" table
CREATE TABLE `website` (
  `id` integer NULL PRIMARY KEY AUTOINCREMENT,
  `domain` text NOT NULL,
  `name` text NULL,
  `icon` text NULL,
  `color` text NULL,
  `created_at` integer NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);
-- Create index "website_domain" to table: "website"
CREATE UNIQUE INDEX `website_domain` ON `website` (`domain`);
-- Create "intention" table
CREATE TABLE `intention` (
  `id` integer NULL PRIMARY KEY AUTOINCREMENT,
  `name` text NOT NULL,
  `behavior_type` text NOT NULL,
  `created_at` integer NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  CHECK (behavior_type IN ('BLOCK'))
);
-- Create "intention_condition" table
CREATE TABLE `intention_condition` (
  `id` integer NULL PRIMARY KEY AUTOINCREMENT,
  `intention_id` integer NOT NULL,
  `condition_phase` text NOT NULL,
  `condition_type` text NOT NULL,
  `time_of_day` text NULL,
  `weekdays` text NULL,
  `created_at` integer NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  CONSTRAINT `0` FOREIGN KEY (`intention_id`) REFERENCES `intention` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CHECK (condition_phase IN ('START', 'END')),
  CHECK (condition_type IN ('TIME', 'MANUAL')),
  CHECK (
        (
            condition_type = 'TIME'
            AND time_of_day IS NOT NULL
            AND length(time_of_day) = 5
            AND time_of_day GLOB '[0-2][0-9]:[0-5][0-9]'
            AND CAST(substr(time_of_day, 1, 2) AS INTEGER) BETWEEN 0 AND 23
            AND (
                weekdays IS NULL
                OR (json_valid(weekdays) AND json_type(weekdays) = 'array')
            )
        )
        OR (
            condition_type = 'MANUAL'
            AND time_of_day IS NULL
            AND weekdays IS NULL
        )
    )
);
-- Create index "idx_intention_condition_intention_id" to table: "intention_condition"
CREATE INDEX `idx_intention_condition_intention_id` ON `intention_condition` (`intention_id`);
-- Create "intention_block" table
CREATE TABLE `intention_block` (
  `intention_id` integer NULL,
  `enforcement_mode` text NOT NULL DEFAULT 'BALANCED',
  `blocks_entire_computer` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  PRIMARY KEY (`intention_id`),
  CONSTRAINT `0` FOREIGN KEY (`intention_id`) REFERENCES `intention` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CHECK (enforcement_mode IN ('CASUAL', 'BALANCED', 'HARDCORE')),
  CHECK (blocks_entire_computer IN (0, 1))
);
-- Create "intention_block_app" table
CREATE TABLE `intention_block_app` (
  `intention_id` integer NOT NULL,
  `app_id` integer NOT NULL,
  PRIMARY KEY (`intention_id`, `app_id`),
  CONSTRAINT `0` FOREIGN KEY (`app_id`) REFERENCES `app` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `1` FOREIGN KEY (`intention_id`) REFERENCES `intention_block` (`intention_id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create "intention_block_website" table
CREATE TABLE `intention_block_website` (
  `intention_id` integer NOT NULL,
  `website_id` integer NOT NULL,
  PRIMARY KEY (`intention_id`, `website_id`),
  CONSTRAINT `0` FOREIGN KEY (`website_id`) REFERENCES `website` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `1` FOREIGN KEY (`intention_id`) REFERENCES `intention_block` (`intention_id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
