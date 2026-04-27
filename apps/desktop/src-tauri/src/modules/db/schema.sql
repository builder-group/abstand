-- Source of truth for the Abstand database schema.
-- Edit this file to change the schema, then run `pnpm db:migrate <name>` to generate a migration.
-- Migrations are applied automatically on app startup via sqlx.

-- Apps: global registry of known apps
CREATE TABLE app (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bundle_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    icon TEXT, -- base64 PNG
    color TEXT, -- hex color
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Websites: global registry of known websites
CREATE TABLE website (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT UNIQUE NOT NULL, -- e.g. "reddit.com"
    name TEXT, -- NULL = use domain
    icon TEXT, -- base64 favicon
    color TEXT, -- hex color
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Intentions: configured commitments that trigger an Abstand
CREATE TABLE intention (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    behavior_type TEXT NOT NULL CHECK (behavior_type IN ('block')),
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Intention conditions: one or more per phase, always evaluated as OR.
-- time conditions fire daily at the given time. manual conditions fire when the user acts.
-- weekdays: JSON array of day numbers [0=Mon .. 6=Sun], NULL = every day for time conditions.
CREATE TABLE intention_condition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intention_id INTEGER NOT NULL REFERENCES intention (id) ON DELETE CASCADE,
    condition_phase TEXT NOT NULL CHECK (condition_phase IN ('start', 'end')),
    condition_type TEXT NOT NULL CHECK (condition_type IN ('time', 'manual')),
    time_of_day TEXT, -- "HH:MM", only for time conditions
    weekdays TEXT, -- JSON array e.g. [0,1,2,3,4], NULL defaults to all days for time conditions
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    CHECK (
        (
            condition_type = 'time'
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
            condition_type = 'manual'
            AND time_of_day IS NULL
            AND weekdays IS NULL
        )
    )
);

CREATE INDEX idx_intention_condition_intention_id ON intention_condition (intention_id);

-- Block configuration: one row per intention whose behavior_type is block
CREATE TABLE intention_block (
    intention_id INTEGER PRIMARY KEY REFERENCES intention (id) ON DELETE CASCADE,
    enforcement_mode TEXT NOT NULL DEFAULT 'balanced' CHECK (enforcement_mode IN ('casual', 'balanced', 'hardcore')),
    target_scope TEXT NOT NULL DEFAULT 'selected_targets' CHECK (target_scope IN ('selected_targets', 'whole_device')),
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Apps blocked by a block intention
CREATE TABLE intention_block_app (
    intention_id INTEGER NOT NULL REFERENCES intention_block (intention_id) ON DELETE CASCADE,
    app_id INTEGER NOT NULL REFERENCES app (id) ON DELETE CASCADE,
    PRIMARY KEY (intention_id, app_id)
);

-- Websites blocked by a block intention
CREATE TABLE intention_block_website (
    intention_id INTEGER NOT NULL REFERENCES intention_block (intention_id) ON DELETE CASCADE,
    website_id INTEGER NOT NULL REFERENCES website (id) ON DELETE CASCADE,
    PRIMARY KEY (intention_id, website_id)
);
