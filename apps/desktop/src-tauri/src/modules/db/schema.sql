-- Source of truth for the Abstand database schema.
-- Edit this file to change the schema, then run `pnpm db:migrate <name>` to generate a migration.
-- Migrations are applied automatically on app startup via sqlx.

-- MARK: - Apps

-- Global registry of known apps
CREATE TABLE app (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Canonical app key; currently bundle ID when available, otherwise path-derived
    stable_id TEXT UNIQUE NOT NULL,
    name TEXT,
    bundle_id TEXT UNIQUE,
    -- Executable or bundle path used to derive stable IDs for unbundled apps
    process_path TEXT,
    icon TEXT, -- base64 PNG
    color TEXT, -- hex color
    updated_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
    created_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
    -- When a bundle ID is available it is the canonical stable app key
    CHECK (bundle_id IS NULL OR stable_id = bundle_id)
);

-- MARK: - Websites

-- Global registry of known websites
CREATE TABLE website (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hostname TEXT UNIQUE NOT NULL, -- e.g. "app.slack.com" or "reddit.com"
    name TEXT,
    icon TEXT, -- base64 favicon
    color TEXT, -- hex color
    updated_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
    created_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
);

-- MARK: - Intentions

-- Configured commitments that trigger an Abstand
-- Note: Behavior-specific payload lives in extension tables
CREATE TABLE intention (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    -- Discriminator for behavior payload tables
    -- Note: Break is a product concept, but its persistence shape is not defined yet
    behavior_type TEXT NOT NULL CHECK (behavior_type IN ('block')),
    updated_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
    created_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
);

-- Supports composite FKs from behavior payload tables
CREATE UNIQUE INDEX intention_id_behavior_type ON intention (id, behavior_type);

-- Block behavior payload
-- Note: Timestamps live on the owning intention row
CREATE TABLE intention_block (
    intention_id INTEGER PRIMARY KEY,
    -- Discriminator for the composite FK to intention
    behavior_type TEXT NOT NULL DEFAULT 'block' CHECK (behavior_type = 'block'),
    enforcement_mode TEXT NOT NULL DEFAULT 'balanced' CHECK (enforcement_mode IN ('casual', 'balanced', 'strict')),
    scope TEXT NOT NULL DEFAULT 'block_targets' CHECK (scope IN ('block_targets', 'allow_targets', 'whole_device')),
    FOREIGN KEY (intention_id, behavior_type) REFERENCES intention (id, behavior_type) ON DELETE CASCADE
);

-- App targets selected by a block intention
-- Note: Ignored when scope = whole_device
CREATE TABLE intention_block_app_target (
    intention_id INTEGER NOT NULL REFERENCES intention_block (intention_id) ON DELETE CASCADE,
    app_id INTEGER NOT NULL REFERENCES app (id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
    PRIMARY KEY (intention_id, app_id)
);

-- Reverse lookup: enforcement checks which intentions target a given app
CREATE INDEX idx_intention_block_app_target_app_id ON intention_block_app_target (app_id, intention_id);

-- Website targets selected by a block intention
-- Note: Ignored when scope = whole_device
CREATE TABLE intention_block_website_target (
    intention_id INTEGER NOT NULL REFERENCES intention_block (intention_id) ON DELETE CASCADE,
    website_id INTEGER NOT NULL REFERENCES website (id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
    PRIMARY KEY (intention_id, website_id)
);

-- Reverse lookup: enforcement checks which intentions target a given website
CREATE INDEX idx_intention_block_website_target_website_id ON intention_block_website_target (website_id, intention_id);

-- MARK: - Intention Conditions

-- Start or end trigger attached to an intention
-- Note: Conditions are evaluated as OR within each phase
-- Note: Each intention should have at least one start condition; cardinality is enforced by the app
-- Note: Rule-specific payload lives in extension tables
CREATE TABLE intention_condition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intention_id INTEGER NOT NULL REFERENCES intention (id) ON DELETE CASCADE,
    phase TEXT NOT NULL CHECK (phase IN ('start', 'end')),
    -- Discriminator for rule payload tables
    rule_type TEXT NOT NULL CHECK (rule_type IN ('schedule', 'date_time', 'manual')),
    updated_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
    created_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
);

CREATE INDEX idx_intention_condition_intention_id ON intention_condition (intention_id);

-- Supports composite FKs from rule payload tables
CREATE UNIQUE INDEX intention_condition_id_rule_type ON intention_condition (id, rule_type);

-- Recurring schedule rule payload
-- Note: Timestamps live on the owning intention_condition row
CREATE TABLE intention_condition_schedule (
    condition_id INTEGER PRIMARY KEY,
    -- Discriminator for the composite FK to intention_condition
    rule_type TEXT NOT NULL DEFAULT 'schedule' CHECK (rule_type = 'schedule'),
    time_of_day_ms INTEGER NOT NULL, -- milliseconds since local 00:00
    weekdays_mask INTEGER, -- NULL means every day; bits 0-6 are Mon-Sun
    FOREIGN KEY (condition_id, rule_type) REFERENCES intention_condition (id, rule_type) ON DELETE CASCADE,
    CHECK (time_of_day_ms >= 0 AND time_of_day_ms < 86400000),
    CHECK (
        weekdays_mask IS NULL
        OR (weekdays_mask > 0 AND weekdays_mask <= 127)
    )
);

-- Date-time rule payload for one upcoming local wall-clock occurrence
-- Note: Timestamps live on the owning intention_condition row
CREATE TABLE intention_condition_date_time (
    condition_id INTEGER PRIMARY KEY,
    -- Discriminator for the composite FK to intention_condition
    rule_type TEXT NOT NULL DEFAULT 'date_time' CHECK (rule_type = 'date_time'),
    date_epoch_days INTEGER NOT NULL, -- local calendar days since 1970-01-01
    time_of_day_ms INTEGER NOT NULL, -- milliseconds since local 00:00
    trigger_at INTEGER NOT NULL, -- resolved fixed Unix millisecond instant
    FOREIGN KEY (condition_id, rule_type) REFERENCES intention_condition (id, rule_type) ON DELETE CASCADE,
    CHECK (date_epoch_days BETWEEN -719162 AND 2932896),
    CHECK (time_of_day_ms >= 0 AND time_of_day_ms < 86400000)
);

-- MARK: - Updated At Triggers

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
