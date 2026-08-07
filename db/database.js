const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const storageDir = path.join(__dirname, "..", "storage");

if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

const db = new Database(path.join(storageDir, "kidora.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        mobile_number TEXT,
        avatar_url TEXT,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'customer',
        email_verified INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        provider_account_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(provider, provider_account_id)
    );

    CREATE TABLE IF NOT EXISTS refresh_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token_hash TEXT NOT NULL,
        user_agent TEXT,
        ip_address TEXT,
        expires_at TEXT NOT NULL,
        revoked_at TEXT,
        created_at TEXT NOT NULL
    );

    -- One row per completed purchase. Digital delivery is instant (no
    -- shipping/payment gateway wired up yet — see checkout.paymentComingSoon
    -- on the frontend), so orders are created already "delivered": the
    -- book is readable the moment the order exists. status is kept as a
    -- free-form column rather than an enum so a real fulfillment pipeline
    -- (e.g. a physical hardcover add-on) can introduce intermediate states
    -- like "processing" later without a schema change.
    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id TEXT NOT NULL,
        book_title TEXT,
        cover_image_url TEXT,
        story_theme TEXT,
        child_name TEXT,
        status TEXT NOT NULL DEFAULT 'delivered',
        total REAL NOT NULL DEFAULT 0,
        placed_at TEXT NOT NULL,
        delivered_at TEXT,
        updated_at TEXT NOT NULL
    );

    -- One review per order (UNIQUE order_id), gated behind an actual
    -- delivered purchase rather than open to anyone. Starts "pending" and
    -- only counts toward the public summary / testimonials feed once
    -- approved — moderation-before-publish given the audience is parents
    -- and children.
    CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id TEXT NOT NULL,
        child_name TEXT,
        story_theme TEXT,
        rating INTEGER NOT NULL,
        title TEXT,
        comment TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_auth_accounts_user_id ON auth_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_id ON refresh_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
    CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
`);

module.exports = db;
