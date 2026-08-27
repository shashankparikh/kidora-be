const { all, get, run, tx } = require("./database");

function rowToBook(row) {
    return row ? JSON.parse(row.data) : null;
}

async function getBook(id) {
    const row = await get("SELECT data FROM books WHERE id = $1", [id]);
    return rowToBook(row);
}

async function createBook(book) {

    const now = new Date().toISOString();

    await run(
        `INSERT INTO books (id, user_id, data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4)`,
        [book.id, book.userId || null, JSON.stringify(book), now]
    );

    return book;

}

// Full replace of the JSON blob, not a partial column update — the merge
// logic (what fields survive from the old book) lives in
// utils/bookHelper.updateBook, same as it did when this was a file write.
async function updateBook(id, book) {

    await run(
        `UPDATE books SET data = $2, user_id = $3, updated_at = $4 WHERE id = $1`,
        [
            id,
            JSON.stringify(book),
            book.userId || null,
            book.updatedAt || new Date().toISOString()
        ]
    );

    return book;

}

async function listBooksForUser(userId) {

    const rows = await all(
        "SELECT data FROM books WHERE user_id = $1 ORDER BY updated_at DESC",
        [userId]
    );

    return rows.map(rowToBook);

}

// Reads and writes a book inside one transaction so a concurrent mutateBook
// on the same id can't interleave and clobber part of the update — the race
// BACKLOG.md P1.1 flagged (a multi-minute illustration generation holding
// stale state in a JS variable and blindly overwriting on completion).
//
// FOR UPDATE is doing the real work and is NOT optional here. Under
// better-sqlite3 the surrounding db.transaction() was enough on its own,
// because SQLite permits a single writer and serialises them globally.
// Postgres runs transactions concurrently, so without the row lock both
// callers would read the same row, merge against the same base, and the
// later COMMIT would silently discard the earlier one — the exact race this
// function exists to prevent. FOR UPDATE makes the second caller wait for
// the first to commit, so it merges against fresh state.
//
// `mutator` receives the current book and returns the next one; throwing
// inside it rolls back the whole transaction, including the read.
async function mutateBook(id, mutator) {

    return tx(async (client) => {

        const result = await client.query(
            "SELECT data FROM books WHERE id = $1 FOR UPDATE",
            [id]
        );

        const current = rowToBook(result.rows[0]);

        if (!current) {
            throw new Error("Book not found");
        }

        const next = await mutator(current);

        await client.query(
            `UPDATE books SET data = $2, user_id = $3, updated_at = $4
             WHERE id = $1`,
            [
                id,
                JSON.stringify(next),
                next.userId || null,
                next.updatedAt || new Date().toISOString()
            ]
        );

        return next;

    });

}

module.exports = {
    getBook,
    createBook,
    updateBook,
    listBooksForUser,
    mutateBook
};
