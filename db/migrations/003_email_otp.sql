-- One-time codes for passwordless email sign-in.
--
-- The code itself is NEVER stored. code_hash holds a bcrypt hash exactly as
-- users.password_hash does, because a six-digit code emailed to someone is a
-- credential: a leaked database should not hand an attacker a list of live
-- codes for addresses they can then sign in as.
--
-- Rows are keyed by id rather than email so that requesting a second code
-- does not destroy the first — both stay valid until they expire, which
-- matters when an email is slow and the customer clicks "resend".
CREATE TABLE IF NOT EXISTS email_otps (
    id          TEXT PRIMARY KEY,
    email       TEXT NOT NULL,
    code_hash   TEXT NOT NULL,
    -- Counted server-side, not in the session: an attacker guessing codes
    -- would otherwise just start a new session per attempt.
    attempts    INTEGER NOT NULL DEFAULT 0,
    expires_at  TEXT NOT NULL,
    -- Set the moment a code is accepted, so a code cannot be replayed even
    -- inside its validity window.
    consumed_at TEXT,
    created_at  TEXT NOT NULL,
    ip_address  TEXT
);

-- Verification looks up the newest live code for an address.
CREATE INDEX IF NOT EXISTS idx_email_otps_email      ON email_otps(email);
-- Expiry sweeps scan by time.
CREATE INDEX IF NOT EXISTS idx_email_otps_expires_at ON email_otps(expires_at);
