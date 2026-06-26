-- Create "runtime_state" table
CREATE TABLE `runtime_state` (
  `key` text NOT NULL,
  `value_json` text NOT NULL,
  `updated_at` integer NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
  `created_at` integer NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
  PRIMARY KEY (`key`),
  CHECK (json_valid(value_json))
);

-- Trigger changes
-- Create trigger "runtime_state_set_updated_at"
CREATE TRIGGER runtime_state_set_updated_at
AFTER UPDATE ON runtime_state
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE runtime_state
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= OLD.updated_at THEN OLD.updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE key = NEW.key;
END;
