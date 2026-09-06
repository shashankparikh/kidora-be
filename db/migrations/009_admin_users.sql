-- Named operator accounts, replacing the single shared ADMIN_USERNAME /
-- ADMIN_PASSWORD login.
--
-- The point is attribution. Every write an operator makes is stamped into
-- order_events.actor, and while one shared account existed that column said
-- "Shashank" no matter who was at the keyboard — which is worse than blank,
-- because it reads as a fact. Three people now work this queue.
--
-- Deliberately separate from the customers `users` table. They are different
-- trust domains with different token secrets (see utils/tokens.js), and a
-- role column on `users` would mean one leaked customer session is one step
-- away from the fulfilment queue.
CREATE TABLE IF NOT EXISTS admin_users (
    id            TEXT PRIMARY KEY,

    -- What they type to sign in. Lowercased on write so "Niharika" and
    -- "niharika" cannot become two accounts.
    username      TEXT UNIQUE NOT NULL,

    -- What the audit trail and the UI show. Kept apart from username so a
    -- person can be "Aakanshi" on screen without that being their login.
    display_name  TEXT NOT NULL,

    password_hash TEXT NOT NULL,

    -- Soft delete. A leaver is deactivated rather than removed, because
    -- order_events references them by name and a row that vanishes makes the
    -- history look like it was written by nobody.
    active        INTEGER NOT NULL DEFAULT 1,

    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(active);
