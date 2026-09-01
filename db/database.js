const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const storageDir = path.join(__dirname, "..", "storage");

if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

const db = new Database(path.join(storageDir, "oopsyink.db"));

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

    -- Marketing opt-in, separate from the users table since a visitor can
    -- subscribe without ever creating an account.
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        subscribed_at TEXT NOT NULL
    );

    -- Book state — previously storage/books/<id>/book.json on local disk,
    -- which doesn't survive a deploy on a container/serverless host and
    -- can't be queried (see BACKLOG.md P1.1: meController used to
    -- fs.readdirSync the whole directory on every request). Kept as a
    -- JSON blob column rather than a full relational redesign since the
    -- book shape is still moving — the win here is durability and
    -- queryability, not normalization.
    CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    -- One row per UTC calendar day. A hard ceiling on how many paid AI
    -- calls (character analysis, story generation, each illustration
    -- attempt) the app will make in a day, so an abuse loop against the
    -- unauthenticated generation endpoints has a bounded worst case
    -- instead of an open-ended one — see BACKLOG.md P0.2/P2.1. Persisted
    -- (not in-memory) so a server restart mid-day can't reset the count.
    CREATE TABLE IF NOT EXISTS ai_usage (
        usage_date TEXT PRIMARY KEY,
        call_count INTEGER NOT NULL DEFAULT 0,
        alerted_at TEXT
    );

    -- One row per Razorpay order this app ever creates — starting from
    -- the moment checkout begins (status 'created'), before the customer
    -- has paid anything. razorpay_order_id/razorpay_payment_id are
    -- Razorpay's own ids, kept UNIQUE so the same payment can never fund
    -- two orders no matter which of the two finalization paths (the
    -- browser's /payments/verify call, or the async webhook) gets there
    -- first — see db/paymentStore.js's claimCapture for how that race is
    -- resolved. add_on_ids/coupon_code are duplicated here (not just
    -- derivable from the eventual order) because the webhook path never
    -- sees the browser's in-memory checkout state and needs everything
    -- required to price the order on its own.
    --
    -- status also covers the refund dead end: 'captured' with order_id
    -- still NULL means Razorpay took the money but neither finalization
    -- path ever created an order for it (see services/paymentService.js's
    -- reconcileOrphanedPayments) — that's what refund_id/refunded_at and
    -- the transient 'refunding' status exist for; see
    -- db/paymentStore.js's claimRefund/markRefunded/markRefundFailed.
    CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id TEXT NOT NULL,
        razorpay_order_id TEXT UNIQUE NOT NULL,
        razorpay_payment_id TEXT UNIQUE,
        status TEXT NOT NULL DEFAULT 'created',
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        add_on_ids TEXT NOT NULL DEFAULT '[]',
        coupon_code TEXT,
        order_id TEXT REFERENCES orders(id),
        failure_reason TEXT,
        refund_id TEXT,
        refunded_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_auth_accounts_user_id ON auth_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_id ON refresh_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
    CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
`);

// One-time, idempotent: imports any pre-existing storage/books/*/book.json
// files into the books table above, and adds a real FK from
// orders.book_id -> books(id) (SQLite can't ALTER a FK onto an existing
// table, so this recreates it — see db/migrateBooksTable.js). Safe to run
// on every boot; it's a no-op once already applied.
require("./migrateBooksTable")(db);

// Adds refund_id/refunded_at to any payments table created before the
// refund reconciliation feature existed — see db/migratePaymentsTable.js.
// No-op on a fresh database (the CREATE TABLE above already has both
// columns) and safe to run on every boot.
require("./migratePaymentsTable")(db);

module.exports = db;
