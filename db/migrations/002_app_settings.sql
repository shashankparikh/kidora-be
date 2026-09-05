-- Operator-controlled runtime settings, editable from the admin console.
--
-- Deliberately a table rather than environment variables: these are product
-- decisions an operator changes while watching how the funnel performs, not
-- deployment config. An env var change means a redeploy and a cold start on
-- the free tier; this is a form field.
--
-- Key/value with a TEXT value rather than typed columns, because the set of
-- settings will grow and each addition would otherwise be a migration. The
-- reading code owns coercion and validation — see db/settingsStore.js, which
-- rejects unknown keys so a typo cannot quietly create a dead setting.
CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT
);

-- Seeded so the table is never empty on a fresh install and the admin screen
-- has something to render. ON CONFLICT DO NOTHING keeps re-running harmless
-- and, more importantly, stops a redeploy resetting an operator's choice.
INSERT INTO app_settings (key, value, updated_at) VALUES
    ('preview_mode',       'web', '2026-08-28T00:00:00.000Z'),
    ('preview_page_count', '4',   '2026-08-28T00:00:00.000Z')
ON CONFLICT (key) DO NOTHING;
