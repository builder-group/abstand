-- Source of truth for the Abstand database schema.
-- Edit this file to change the schema, then run `pnpm db:migrate <name>` to generate a migration.
-- Migrations are applied automatically on app startup via sqlx.
--
-- Timestamp columns store Unix milliseconds.
-- updated_at is maintained by triggers for mutable tables.

-- MARK: - Apps

-- Apps: global registry of known apps
CREATE TABLE app (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stable_id TEXT UNIQUE NOT NULL, -- canonical app key; currently bundle ID when available, otherwise path-derived
    bundle_id TEXT UNIQUE,
    name TEXT NOT NULL,
    process_path TEXT, -- executable or bundle path
    icon TEXT, -- base64 PNG
    color TEXT, -- hex color
    updated_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
    created_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
    CHECK (bundle_id IS NULL OR stable_id = bundle_id)
);

-- MARK: - Websites

-- Websites: global registry of known websites
CREATE TABLE website (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT UNIQUE NOT NULL, -- e.g. "reddit.com"
    name TEXT, -- NULL = use domain
    icon TEXT, -- base64 favicon
    color TEXT, -- hex color
    updated_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
    created_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
);

-- MARK: - Intentions

-- Intentions: configured commitments that trigger an Abstand
CREATE TABLE intention (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    -- Discriminator for the behavior-specific configuration table.
    -- Note: Break is a product concept, but its persistence shape is not defined yet.
    behavior_type TEXT NOT NULL CHECK (behavior_type IN ('block')),
    updated_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
    created_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
);

-- MARK: - Intention Conditions

-- Intention conditions: one or more per phase, evaluated as OR.
-- Each intention should have at least one start condition and one end condition; cardinality is enforced by the application.
-- time conditions fire daily at the given local wall-clock time. manual conditions fire when the user acts.
CREATE TABLE intention_condition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intention_id INTEGER NOT NULL REFERENCES intention (id) ON DELETE CASCADE,
    phase TEXT NOT NULL CHECK (phase IN ('start', 'end')),
    rule_type TEXT NOT NULL CHECK (rule_type IN ('time', 'manual')),
    time_of_day TEXT, -- "HH:MM", only for time conditions
    weekdays TEXT, -- JSON array e.g. ["mon","tue","wed","thu","fri"], NULL defaults to all days for time conditions
    updated_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
    created_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
    CHECK (
        (
            rule_type = 'time'
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
            rule_type = 'manual'
            AND time_of_day IS NULL
            AND weekdays IS NULL
        )
    )
);

CREATE INDEX idx_intention_condition_intention_id ON intention_condition (intention_id);

-- MARK: - Intention Block

-- Block configuration: one row per intention whose behavior_type is block
CREATE TABLE intention_block (
    intention_id INTEGER PRIMARY KEY REFERENCES intention (id) ON DELETE CASCADE,
    enforcement_mode TEXT NOT NULL DEFAULT 'balanced' CHECK (enforcement_mode IN ('casual', 'balanced', 'hardcore')),
    scope TEXT NOT NULL DEFAULT 'block_targets' CHECK (scope IN ('block_targets', 'allow_targets', 'whole_device')),
    updated_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
    created_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
);

-- MARK: - Intention Block Targets

-- App targets selected by a block intention.
CREATE TABLE intention_block_app_target (
    intention_id INTEGER NOT NULL REFERENCES intention_block (intention_id) ON DELETE CASCADE,
    app_id INTEGER NOT NULL REFERENCES app (id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
    PRIMARY KEY (intention_id, app_id)
);

-- Website targets selected by a block intention.
CREATE TABLE intention_block_website_target (
    intention_id INTEGER NOT NULL REFERENCES intention_block (intention_id) ON DELETE CASCADE,
    website_id INTEGER NOT NULL REFERENCES website (id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
    PRIMARY KEY (intention_id, website_id)
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

CREATE TRIGGER intention_block_set_updated_at
AFTER UPDATE ON intention_block
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE intention_block
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= OLD.updated_at THEN OLD.updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE intention_id = NEW.intention_id;
END;
