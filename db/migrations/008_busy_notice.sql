-- Operator-set note shown to customers when turnaround is slower than usual.
-- Seeded empty, which means no banner.
INSERT INTO app_settings (key, value, updated_at)
VALUES ('busy_notice', '', '2026-09-05T00:00:00.000Z')
ON CONFLICT (key) DO NOTHING;
