-- Create "activity_foreground" table
CREATE TABLE `activity_foreground` (
  `id` integer NULL PRIMARY KEY AUTOINCREMENT,
  `app_id` integer NOT NULL,
  `website_id` integer NULL,
  `capture_level` text NOT NULL,
  `window_title` text NULL,
  `window_id` integer NULL,
  `window_x` real NULL,
  `window_y` real NULL,
  `window_width` real NULL,
  `window_height` real NULL,
  `browser_url` text NULL,
  `browser_is_private` integer NULL,
  `started_at` integer NOT NULL,
  `ended_at` integer NULL,
  `updated_at` integer NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
  `created_at` integer NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
  CONSTRAINT `0` FOREIGN KEY (`website_id`) REFERENCES `website` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT `1` FOREIGN KEY (`app_id`) REFERENCES `app` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CHECK (capture_level IN ('app', 'window', 'browser')),
  CHECK (ended_at IS NULL OR ended_at >= started_at),
  CHECK (browser_is_private IS NULL OR browser_is_private IN (0, 1)),
  CHECK (
        capture_level != 'app'
        OR (
            website_id IS NULL
            AND window_title IS NULL
            AND window_id IS NULL
            AND window_x IS NULL
            AND window_y IS NULL
            AND window_width IS NULL
            AND window_height IS NULL
            AND browser_url IS NULL
            AND browser_is_private IS NULL
        )
    ),
  CHECK (
        capture_level != 'window'
        OR (
            website_id IS NULL
            AND browser_url IS NULL
            AND browser_is_private IS NULL
        )
    ),
  CHECK (
        capture_level != 'browser'
        OR browser_is_private IS NOT NULL
        OR website_id IS NOT NULL
        OR browser_url IS NOT NULL
    )
);
-- Create index "activity_foreground_one_active" to table: "activity_foreground"
CREATE UNIQUE INDEX `activity_foreground_one_active` ON `activity_foreground` ((1)) WHERE ended_at IS NULL;
-- Create index "idx_activity_foreground_app_id_started_at" to table: "activity_foreground"
CREATE INDEX `idx_activity_foreground_app_id_started_at` ON `activity_foreground` (`app_id`, `started_at`);
-- Create index "idx_activity_foreground_started_at" to table: "activity_foreground"
CREATE INDEX `idx_activity_foreground_started_at` ON `activity_foreground` (`started_at`);
-- Create index "idx_activity_foreground_website_id_started_at" to table: "activity_foreground"
CREATE INDEX `idx_activity_foreground_website_id_started_at` ON `activity_foreground` (`website_id`, `started_at`) WHERE website_id IS NOT NULL;

-- Trigger changes
-- Create trigger "activity_foreground_set_updated_at"
CREATE TRIGGER activity_foreground_set_updated_at
AFTER UPDATE ON activity_foreground
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE activity_foreground
    SET updated_at = CASE
        WHEN CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) <= OLD.updated_at THEN OLD.updated_at + 1
        ELSE CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
    END
    WHERE id = NEW.id;
END;
