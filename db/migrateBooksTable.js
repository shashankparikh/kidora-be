const fs = require("fs");
const path = require("path");

const LEGACY_BOOKS_DIR = path.join(__dirname, "..", "storage", "books");

// Reads any storage/books/<id>/book.json left over from before books
// moved into SQLite (see BACKLOG.md P1.1) and inserts rows that aren't
// already present. Safe to run repeatedly — existing ids are skipped.
function importLegacyBookFiles(db) {

    if (!fs.existsSync(LEGACY_BOOKS_DIR)) {
        return;
    }

    const insert = db.prepare(
        `INSERT OR IGNORE INTO books (id, user_id, data, created_at, updated_at)
         VALUES (@id, @userId, @data, @createdAt, @updatedAt)`
    );

    const entries = fs.readdirSync(LEGACY_BOOKS_DIR, { withFileTypes: true });

    for (const entry of entries) {

        if (!entry.isDirectory()) {
            continue;
        }

        const bookFile = path.join(LEGACY_BOOKS_DIR, entry.name, "book.json");

        if (!fs.existsSync(bookFile)) {
            continue;
        }

        try {

            const raw = fs.readFileSync(bookFile, "utf8");
            const book = JSON.parse(raw);

            insert.run({
                id: book.id || entry.name,
                userId: book.userId || null,
                data: raw,
                createdAt: book.createdAt || new Date().toISOString(),
                updatedAt: book.updatedAt || new Date().toISOString()
            });

        } catch (error) {
            console.error(`Skipping unreadable legacy book ${entry.name}:`, error.message);
        }

    }

}

function ordersHasBookFk(db) {

    return db.prepare("PRAGMA foreign_key_list(orders)")
        .all()
        .some((fk) => fk.table === "books");

}

// orders.book_id had no FK when orders was first created — any book_id
// could point at nothing (see BACKLOG.md P1.1). Before the FK can be
// added, every existing order needs a matching books row, so orphaned
// references (e.g. seeded demo data) get a minimal stub rather than
// blocking the migration or silently dropping the order.
function backfillOrphanedOrderBooks(db) {

    const orphans = db.prepare(
        `SELECT DISTINCT o.book_id FROM orders o
         LEFT JOIN books b ON b.id = o.book_id
         WHERE b.id IS NULL`
    ).all();

    if (orphans.length === 0) {
        return;
    }

    const insert = db.prepare(
        `INSERT OR IGNORE INTO books (id, user_id, data, created_at, updated_at)
         VALUES (@id, NULL, @data, @now, @now)`
    );

    const now = new Date().toISOString();

    for (const { book_id: bookId } of orphans) {

        insert.run({
            id: bookId,
            data: JSON.stringify({
                id: bookId,
                status: "ARCHIVED_STUB",
                note: "Reconstructed placeholder — original book record was missing when the orders.book_id foreign key was added."
            }),
            now
        });

    }

}

// SQLite can't ALTER TABLE to add a foreign key to an existing table, so
// this recreates orders with the FK in place and copies every row across.
function addOrdersBookFk(db) {

    db.pragma("foreign_keys = OFF");

    const migrate = db.transaction(() => {

        db.exec(`
            CREATE TABLE orders_new (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                book_id TEXT NOT NULL REFERENCES books(id),
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

            INSERT INTO orders_new SELECT * FROM orders;

            DROP TABLE orders;
            ALTER TABLE orders_new RENAME TO orders;

            CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
        `);

    });

    migrate();

    db.pragma("foreign_keys = ON");

}

module.exports = function migrateBooksTable(db) {

    importLegacyBookFiles(db);

    if (!ordersHasBookFk(db)) {
        backfillOrphanedOrderBooks(db);
        addOrdersBookFk(db);
    }

};
