-- How many reminders have gone out for a preview.
--
-- A counter rather than two booleans: it reads as "how far through the nudge
-- sequence are we", extends without a migration if a third reminder is ever
-- added, and makes the send idempotent — the sweep only ever writes a value
-- higher than the current one, so a restart mid-sweep or two overlapping
-- sweeps cannot send the same reminder twice.
ALTER TABLE previews ADD COLUMN IF NOT EXISTS nudges_sent INTEGER NOT NULL DEFAULT 0;
