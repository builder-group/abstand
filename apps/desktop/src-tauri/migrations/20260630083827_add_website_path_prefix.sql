-- Disable the enforcement of foreign-keys constraints
PRAGMA foreign_keys = off;
-- Create "new_intention_block_website_target" table
CREATE TABLE `new_intention_block_website_target` (
  `intention_id` integer NOT NULL,
  `website_id` integer NOT NULL,
  `path` text NOT NULL DEFAULT '',
  `action` text NOT NULL DEFAULT 'block',
  `created_at` integer NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
  PRIMARY KEY (`intention_id`, `website_id`, `path`),
  CONSTRAINT `0` FOREIGN KEY (`website_id`) REFERENCES `website` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `1` FOREIGN KEY (`intention_id`) REFERENCES `intention_block` (`intention_id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CHECK (path = '' OR substr(path, 1, 1) = '/'),
  CHECK (action IN ('block', 'allow'))
);
-- Copy rows from old table "intention_block_website_target" to new temporary table "new_intention_block_website_target"
INSERT INTO `new_intention_block_website_target` (`intention_id`, `website_id`, `action`, `created_at`) SELECT `intention_id`, `website_id`, `action`, `created_at` FROM `intention_block_website_target`;
-- Drop "intention_block_website_target" table after copying rows
DROP TABLE `intention_block_website_target`;
-- Rename temporary table "new_intention_block_website_target" to "intention_block_website_target"
ALTER TABLE `new_intention_block_website_target` RENAME TO `intention_block_website_target`;
-- Create index "idx_intention_block_website_target_website_id" to table: "intention_block_website_target"
CREATE INDEX `idx_intention_block_website_target_website_id` ON `intention_block_website_target` (`website_id`, `intention_id`, `path`);
-- Enable back the enforcement of foreign-keys constraints
PRAGMA foreign_keys = on;

-- Trigger changes
-- Create trigger "intention_block_website_target_touch_intention_after_insert"
CREATE TRIGGER intention_block_website_target_touch_intention_after_insert
AFTER INSERT ON intention_block_website_target
FOR EACH ROW
BEGIN
    UPDATE intention
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.intention_id;
END;
-- Create trigger "intention_block_website_target_touch_intention_after_delete"
CREATE TRIGGER intention_block_website_target_touch_intention_after_delete
AFTER DELETE ON intention_block_website_target
FOR EACH ROW
BEGIN
    UPDATE intention
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = OLD.intention_id;
END;
