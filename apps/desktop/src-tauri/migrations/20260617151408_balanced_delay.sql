-- Disable the enforcement of foreign-keys constraints
PRAGMA foreign_keys = off;
-- Create "new_intention_block" table
CREATE TABLE `new_intention_block` (
  `intention_id` integer NULL,
  `behavior_type` text NOT NULL DEFAULT 'block',
  `enforcement_mode` text NOT NULL DEFAULT 'balanced',
  `balanced_delay_ms` integer NOT NULL DEFAULT 15000,
  `scope` text NOT NULL DEFAULT 'block_targets',
  PRIMARY KEY (`intention_id`),
  CONSTRAINT `0` FOREIGN KEY (`intention_id`, `behavior_type`) REFERENCES `intention` (`id`, `behavior_type`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CHECK (behavior_type = 'block'),
  CHECK (enforcement_mode IN ('casual', 'balanced', 'strict')),
  CHECK (balanced_delay_ms > 0),
  CHECK (scope IN ('block_targets', 'allow_targets', 'whole_device'))
);
-- Copy rows from old table "intention_block" to new temporary table "new_intention_block"
INSERT INTO `new_intention_block` (`intention_id`, `behavior_type`, `enforcement_mode`, `scope`) SELECT `intention_id`, `behavior_type`, `enforcement_mode`, `scope` FROM `intention_block`;
-- Drop "intention_block" table after copying rows
DROP TABLE `intention_block`;
-- Rename temporary table "new_intention_block" to "intention_block"
ALTER TABLE `new_intention_block` RENAME TO `intention_block`;
-- Enable back the enforcement of foreign-keys constraints
PRAGMA foreign_keys = on;

-- Trigger changes
-- Create trigger "intention_block_touch_intention_after_insert"
CREATE TRIGGER intention_block_touch_intention_after_insert
AFTER INSERT ON intention_block
FOR EACH ROW
BEGIN
    UPDATE intention
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.intention_id;
END;
-- Create trigger "intention_block_touch_intention_after_update"
CREATE TRIGGER intention_block_touch_intention_after_update
AFTER UPDATE ON intention_block
FOR EACH ROW
BEGIN
    UPDATE intention
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.intention_id;
END;
-- Create trigger "intention_block_touch_intention_after_delete"
CREATE TRIGGER intention_block_touch_intention_after_delete
AFTER DELETE ON intention_block
FOR EACH ROW
BEGIN
    UPDATE intention
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = OLD.intention_id;
END;
