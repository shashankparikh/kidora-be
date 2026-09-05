-- Kidora storefront schema, ported from better-sqlite3 (db/database.js).
--
-- Shares a Supabase project with the engine's own tables (jobs, job_states,
-- caption_review); no name collides.
--
-- THREE TYPE CHOICES ARE DELIBERATE, so the JS stores port without a
-- behaviour change:
--
--   * timestamps are TEXT, not timestamptz. Every store writes an ISO-8601
--     string and services/authService.js does new Date(session.expires_at).
--     ISO-8601 sorts lexicographically, so ordering and range scans still
--     work, and node-postgres hands back the exact string that went in.
--   * email_verified is INTEGER, not boolean. Reads go through
--     Boolean(row.email_verified) either way, but the inserts pass 0/1 and
--     node-postgres will not coerce those into a boolean column.
--   * orders.total is DOUBLE PRECISION, not NUMERIC. node-postgres returns
--     NUMERIC as a *string* to preserve arbitrary precision, which would
--     turn every price sum into string concatenation, silently.

CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    first_name    TEXT,
    last_name     TEXT,
    mobile_number TEXT,
    avatar_url    TEXT,
    password_hash TEXT,
    role          TEXT NOT NULL DEFAULT 'customer',
    email_verified INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_accounts (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    created_at          TEXT NOT NULL,
    UNIQUE (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS refresh_sessions (
    id                 TEXT PRIMARY KEY,
    user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    user_agent         TEXT,
    ip_address         TEXT,
    expires_at         TEXT NOT NULL,
    revoked_at         TEXT,
    created_at         TEXT NOT NULL
);

-- Book state. A JSON blob column rather than a relational design because the
-- book shape is still moving; the win is durability and queryability.
-- Declared before orders so the orders.book_id FK below can reference it.
CREATE TABLE IF NOT EXISTS books (
    id         TEXT PRIMARY KEY,
    user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
    data       TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- One row per completed purchase. Digital delivery is instant, so orders are
-- created already "delivered". status is free-form rather than an enum so a
-- real fulfillment pipeline can add intermediate states without a migration.
CREATE TABLE IF NOT EXISTS orders (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id         TEXT NOT NULL REFERENCES books(id),
    book_title      TEXT,
    cover_image_url TEXT,
    story_theme     TEXT,
    child_name      TEXT,
    status          TEXT NOT NULL DEFAULT 'delivered',
    total           DOUBLE PRECISION NOT NULL DEFAULT 0,
    placed_at       TEXT NOT NULL,
    delivered_at    TEXT,
    updated_at      TEXT NOT NULL
);

-- One review per order, gated behind a delivered purchase. Starts "pending";
-- moderation-before-publish, given the audience is parents and children.
CREATE TABLE IF NOT EXISTS reviews (
    id          TEXT PRIMARY KEY,
    order_id    TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id     TEXT NOT NULL,
    child_name  TEXT,
    story_theme TEXT,
    rating      INTEGER NOT NULL,
    title       TEXT,
    comment     TEXT,
    status      TEXT NOT NULL DEFAULT 'pending',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

-- Marketing opt-in, separate from users since a visitor can subscribe
-- without ever creating an account.
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    subscribed_at TEXT NOT NULL
);

-- One row per UTC calendar day. A hard ceiling on paid AI calls so an abuse
-- loop against the anonymous generation endpoints has a bounded worst case.
-- Persisted, not in-memory, so a restart mid-day cannot reset the count.
CREATE TABLE IF NOT EXISTS ai_usage (
    usage_date TEXT PRIMARY KEY,
    call_count INTEGER NOT NULL DEFAULT 0,
    alerted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_accounts_user_id    ON auth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_id ON refresh_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id           ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status           ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id          ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_books_user_id            ON books(user_id);
