-- Create "app" table
CREATE TABLE `app` (
  `id` integer NULL PRIMARY KEY AUTOINCREMENT,
  `stable_id` text NOT NULL,
  `name` text NULL,
  `bundle_id` text NULL,
  `process_path` text NULL,
  `icon` text NULL,
  `color` text NULL,
  `updated_at` integer NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
  `created_at` integer NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
  CHECK (bundle_id IS NULL OR stable_id = bundle_id)
);
-- Create index "app_stable_id" to table: "app"
CREATE UNIQUE INDEX `app_stable_id` ON `app` (`stable_id`);
-- Create index "app_bundle_id" to table: "app"
CREATE UNIQUE INDEX `app_bundle_id` ON `app` (`bundle_id`);
-- Create "intention" table
CREATE TABLE `intention` (
  `id` integer NULL PRIMARY KEY AUTOINCREMENT,
  `name` text NOT NULL,
  `behavior_type` text NOT NULL,
  `updated_at` integer NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
  `created_at` integer NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
  CHECK (behavior_type IN ('block'))
);
-- Create index "intention_id_behavior_type" to table: "intention"
CREATE UNIQUE INDEX `intention_id_behavior_type` ON `intention` (`id`, `behavior_type`);
-- Create "intention_block" table
CREATE TABLE `intention_block` (
  `intention_id` integer NULL,
  `behavior_type` text NOT NULL DEFAULT 'block',
  `enforcement_mode` text NOT NULL DEFAULT 'balanced',
  `scope` text NOT NULL DEFAULT 'block_targets',
  PRIMARY KEY (`intention_id`),
  CONSTRAINT `0` FOREIGN KEY (`intention_id`, `behavior_type`) REFERENCES `intention` (`id`, `behavior_type`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CHECK (behavior_type = 'block'),
  CHECK (enforcement_mode IN ('casual', 'balanced', 'strict')),
  CHECK (scope IN ('block_targets', 'allow_targets', 'whole_device'))
);
-- Create "intention_block_app_target" table
CREATE TABLE `intention_block_app_target` (
  `intention_id` integer NOT NULL,
  `app_id` integer NOT NULL,
  `created_at` integer NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
  PRIMARY KEY (`intention_id`, `app_id`),
  CONSTRAINT `0` FOREIGN KEY (`app_id`) REFERENCES `app` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `1` FOREIGN KEY (`intention_id`) REFERENCES `intention_block` (`intention_id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "idx_intention_block_app_target_app_id" to table: "intention_block_app_target"
CREATE INDEX `idx_intention_block_app_target_app_id` ON `intention_block_app_target` (`app_id`, `intention_id`);
-- Create "intention_block_website_target" table
CREATE TABLE `intention_block_website_target` (
  `intention_id` integer NOT NULL,
  `website_id` integer NOT NULL,
  `created_at` integer NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
  PRIMARY KEY (`intention_id`, `website_id`),
  CONSTRAINT `0` FOREIGN KEY (`website_id`) REFERENCES `website` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `1` FOREIGN KEY (`intention_id`) REFERENCES `intention_block` (`intention_id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "idx_intention_block_website_target_website_id" to table: "intention_block_website_target"
CREATE INDEX `idx_intention_block_website_target_website_id` ON `intention_block_website_target` (`website_id`, `intention_id`);
-- Create "intention_condition" table
CREATE TABLE `intention_condition` (
  `id` integer NULL PRIMARY KEY AUTOINCREMENT,
  `intention_id` integer NOT NULL,
  `transition` text NOT NULL,
  `rule_type` text NOT NULL,
  `updated_at` integer NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
  `created_at` integer NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
  CONSTRAINT `0` FOREIGN KEY (`intention_id`) REFERENCES `intention` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CHECK (transition IN ('start', 'end')),
  CHECK (rule_type IN ('schedule', 'date_time', 'after_transition', 'manual'))
);
-- Create index "idx_intention_condition_intention_id" to table: "intention_condition"
CREATE INDEX `idx_intention_condition_intention_id` ON `intention_condition` (`intention_id`);
-- Create index "intention_condition_id_rule_type" to table: "intention_condition"
CREATE UNIQUE INDEX `intention_condition_id_rule_type` ON `intention_condition` (`id`, `rule_type`);
-- Create "intention_condition_after_transition" table
CREATE TABLE `intention_condition_after_transition` (
  `condition_id` integer NULL,
  `rule_type` text NOT NULL DEFAULT 'after_transition',
  `anchor_transition` text NOT NULL,
  `offset_ms` integer NOT NULL,
  PRIMARY KEY (`condition_id`),
  CONSTRAINT `0` FOREIGN KEY (`condition_id`, `rule_type`) REFERENCES `intention_condition` (`id`, `rule_type`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CHECK (rule_type = 'after_transition'),
  CHECK (anchor_transition IN ('start', 'end')),
  CHECK (offset_ms > 0)
);
-- Create "intention_condition_date_time" table
CREATE TABLE `intention_condition_date_time` (
  `condition_id` integer NULL,
  `rule_type` text NOT NULL DEFAULT 'date_time',
  `date_epoch_days` integer NOT NULL,
  `time_of_day_ms` integer NOT NULL,
  `trigger_at` integer NOT NULL,
  PRIMARY KEY (`condition_id`),
  CONSTRAINT `0` FOREIGN KEY (`condition_id`, `rule_type`) REFERENCES `intention_condition` (`id`, `rule_type`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CHECK (rule_type = 'date_time'),
  CHECK (date_epoch_days BETWEEN -719162 AND 2932896),
  CHECK (time_of_day_ms >= 0 AND time_of_day_ms < 86400000)
);
-- Create "intention_condition_schedule" table
CREATE TABLE `intention_condition_schedule` (
  `condition_id` integer NULL,
  `rule_type` text NOT NULL DEFAULT 'schedule',
  `time_of_day_ms` integer NOT NULL,
  `weekdays_mask` integer NULL,
  PRIMARY KEY (`condition_id`),
  CONSTRAINT `0` FOREIGN KEY (`condition_id`, `rule_type`) REFERENCES `intention_condition` (`id`, `rule_type`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CHECK (rule_type = 'schedule'),
  CHECK (time_of_day_ms >= 0 AND time_of_day_ms < 86400000),
  CHECK (
        weekdays_mask IS NULL
        OR (weekdays_mask > 0 AND weekdays_mask <= 127)
    )
);
-- Create "intention_session" table
CREATE TABLE `intention_session` (
  `id` integer NULL PRIMARY KEY AUTOINCREMENT,
  `intention_id` integer NOT NULL,
  `status` text NOT NULL,
  `started_at` integer NOT NULL,
  `start_condition_id` integer NULL,
  `ended_at` integer NULL,
  `end_condition_id` integer NULL,
  `updated_at` integer NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
  `created_at` integer NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
  CONSTRAINT `0` FOREIGN KEY (`end_condition_id`) REFERENCES `intention_condition` (`id`) ON UPDATE NO ACTION ON DELETE SET NULL,
  CONSTRAINT `1` FOREIGN KEY (`start_condition_id`) REFERENCES `intention_condition` (`id`) ON UPDATE NO ACTION ON DELETE SET NULL,
  CONSTRAINT `2` FOREIGN KEY (`intention_id`) REFERENCES `intention` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CHECK (status IN ('active', 'completed', 'stopped')),
  CHECK (
        (
            status = 'active'
            AND ended_at IS NULL
            AND end_condition_id IS NULL
        )
        OR (
            status = 'completed'
            AND ended_at IS NOT NULL
        )
        OR (
            status = 'stopped'
            AND ended_at IS NOT NULL
            AND end_condition_id IS NULL
        )
    ),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);
-- Create index "idx_intention_session_intention_id" to table: "intention_session"
CREATE INDEX `idx_intention_session_intention_id` ON `intention_session` (`intention_id`);
-- Create index "intention_session_one_active_per_intention" to table: "intention_session"
CREATE UNIQUE INDEX `intention_session_one_active_per_intention` ON `intention_session` (`intention_id`) WHERE status = 'active';
-- Create "website" table
CREATE TABLE `website` (
  `id` integer NULL PRIMARY KEY AUTOINCREMENT,
  `hostname` text NOT NULL,
  `name` text NULL,
  `icon` text NULL,
  `color` text NULL,
  `updated_at` integer NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
  `created_at` integer NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
);
-- Create index "website_hostname" to table: "website"
CREATE UNIQUE INDEX `website_hostname` ON `website` (`hostname`);

-- Trigger changes
-- Create trigger "app_set_updated_at"
CREATE TRIGGER app_set_updated_at
AFTER UPDATE ON app
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE app
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= OLD.updated_at THEN OLD.updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.id;
END;
-- Create trigger "website_set_updated_at"
CREATE TRIGGER website_set_updated_at
AFTER UPDATE ON website
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE website
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= OLD.updated_at THEN OLD.updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.id;
END;
-- Create trigger "intention_set_updated_at"
CREATE TRIGGER intention_set_updated_at
AFTER UPDATE ON intention
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE intention
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= OLD.updated_at THEN OLD.updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.id;
END;
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
-- Create trigger "intention_block_app_target_touch_intention_after_insert"
CREATE TRIGGER intention_block_app_target_touch_intention_after_insert
AFTER INSERT ON intention_block_app_target
FOR EACH ROW
BEGIN
    UPDATE intention
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.intention_id;
END;
-- Create trigger "intention_block_app_target_touch_intention_after_delete"
CREATE TRIGGER intention_block_app_target_touch_intention_after_delete
AFTER DELETE ON intention_block_app_target
FOR EACH ROW
BEGIN
    UPDATE intention
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = OLD.intention_id;
END;
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
-- Create trigger "intention_condition_touch_intention_after_insert"
CREATE TRIGGER intention_condition_touch_intention_after_insert
AFTER INSERT ON intention_condition
FOR EACH ROW
BEGIN
    UPDATE intention
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.intention_id;
END;
-- Create trigger "intention_condition_touch_intention_after_update"
CREATE TRIGGER intention_condition_touch_intention_after_update
AFTER UPDATE ON intention_condition
FOR EACH ROW
WHEN NEW.updated_at != OLD.updated_at
BEGIN
    UPDATE intention
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.intention_id;
END;
-- Create trigger "intention_condition_touch_intention_after_delete"
CREATE TRIGGER intention_condition_touch_intention_after_delete
AFTER DELETE ON intention_condition
FOR EACH ROW
BEGIN
    UPDATE intention
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = OLD.intention_id;
END;
-- Create trigger "intention_condition_set_updated_at"
CREATE TRIGGER intention_condition_set_updated_at
AFTER UPDATE ON intention_condition
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE intention_condition
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= OLD.updated_at THEN OLD.updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.id;
END;
-- Create trigger "intention_condition_schedule_touch_condition_after_insert"
CREATE TRIGGER intention_condition_schedule_touch_condition_after_insert
AFTER INSERT ON intention_condition_schedule
FOR EACH ROW
BEGIN
    UPDATE intention_condition
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.condition_id;
END;
-- Create trigger "intention_condition_schedule_touch_condition_after_update"
CREATE TRIGGER intention_condition_schedule_touch_condition_after_update
AFTER UPDATE ON intention_condition_schedule
FOR EACH ROW
BEGIN
    UPDATE intention_condition
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.condition_id;
END;
-- Create trigger "intention_condition_schedule_touch_condition_after_delete"
CREATE TRIGGER intention_condition_schedule_touch_condition_after_delete
AFTER DELETE ON intention_condition_schedule
FOR EACH ROW
BEGIN
    UPDATE intention_condition
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = OLD.condition_id;
END;
-- Create trigger "intention_condition_date_time_touch_condition_after_insert"
CREATE TRIGGER intention_condition_date_time_touch_condition_after_insert
AFTER INSERT ON intention_condition_date_time
FOR EACH ROW
BEGIN
    UPDATE intention_condition
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.condition_id;
END;
-- Create trigger "intention_condition_date_time_touch_condition_after_update"
CREATE TRIGGER intention_condition_date_time_touch_condition_after_update
AFTER UPDATE ON intention_condition_date_time
FOR EACH ROW
BEGIN
    UPDATE intention_condition
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.condition_id;
END;
-- Create trigger "intention_condition_date_time_touch_condition_after_delete"
CREATE TRIGGER intention_condition_date_time_touch_condition_after_delete
AFTER DELETE ON intention_condition_date_time
FOR EACH ROW
BEGIN
    UPDATE intention_condition
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = OLD.condition_id;
END;
-- Create trigger "intention_condition_after_transition_touch_condition_after_insert"
CREATE TRIGGER intention_condition_after_transition_touch_condition_after_insert
AFTER INSERT ON intention_condition_after_transition
FOR EACH ROW
BEGIN
    UPDATE intention_condition
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.condition_id;
END;
-- Create trigger "intention_condition_after_transition_touch_condition_after_update"
CREATE TRIGGER intention_condition_after_transition_touch_condition_after_update
AFTER UPDATE ON intention_condition_after_transition
FOR EACH ROW
BEGIN
    UPDATE intention_condition
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.condition_id;
END;
-- Create trigger "intention_condition_after_transition_touch_condition_after_delete"
CREATE TRIGGER intention_condition_after_transition_touch_condition_after_delete
AFTER DELETE ON intention_condition_after_transition
FOR EACH ROW
BEGIN
    UPDATE intention_condition
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= updated_at THEN updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = OLD.condition_id;
END;
-- Create trigger "intention_session_set_updated_at"
CREATE TRIGGER intention_session_set_updated_at
AFTER UPDATE ON intention_session
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE intention_session
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= OLD.updated_at THEN OLD.updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.id;
END;
