// Adds the two columns the orphaned-payment refund feature needs
// (refund_id, refunded_at) to a payments table that predates it. SQLite's
// ALTER TABLE ADD COLUMN is a cheap, in-place metadata change here (no FK
// or NOT NULL involved), unlike db/migrateBooksTable.js's orders migration
// which needed a full table recreation — so this stays simple.
function hasColumn(db, table, column) {
    return db.prepare(`PRAGMA table_info(${table})`)
        .all()
        .some((col) => col.name === column);
}

module.exports = function migratePaymentsTable(db) {

    if (!hasColumn(db, "payments", "refund_id")) {
        db.exec("ALTER TABLE payments ADD COLUMN refund_id TEXT");
    }

    if (!hasColumn(db, "payments", "refunded_at")) {
        db.exec("ALTER TABLE payments ADD COLUMN refunded_at TEXT");
    }

};
