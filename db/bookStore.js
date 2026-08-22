const db = require("./database");

function rowToBook(row) {
    return row ? JSON.parse(row.data) : null;
}

function getBook(id) {
    const row = db.prepare("SELECT data FROM books WHERE id = ?").get(id);
    return rowToBook(row);
}

function createBook(book) {

    const now = new Date().toISOString();

    db.prepare(
        `INSERT INTO books (id, user_id, data, created_at, updated_at)
         VALUES (@id, @userId, @data, @now, @now)`
    ).run({
        id: book.id,
        userId: book.userId || null,
        data: JSON.stringify(book),
        now
    });

    return book;

}

// Full replace of the JSON blob, not a partial column update — the merge
// logic (what fields survive from the old book) lives in
// utils/bookHelper.updateBook, same as it did when this was a file write.
function updateBook(id, book) {

    db.prepare(
        `UPDATE books SET data = @data, user_id = @userId, updated_at = @updatedAt WHERE id = @id`
    ).run({
        id,
        userId: book.userId || null,
        data: JSON.stringify(book),
        updatedAt: book.updatedAt || new Date().toISOString()
    });

    return book;

}

function listBooksForUser(userId) {

    const rows = db.prepare(
        "SELECT data FROM books WHERE user_id = ? ORDER BY updated_at DESC"
    ).all(userId);

    return rows.map(rowToBook);

}

// Reads and writes a book inside a single SQLite transaction so a
// concurrent mutateBook call on the same id can't interleave and clobber
// part of the update — the race BACKLOG.md P1.1 flagged (a multi-minute
// illustration generation holding stale state in a JS variable and
// blindly overwriting on completion). `mutator` receives the current book
// and returns the next one; throwing inside it rolls back the whole
// transaction, including the read.
const mutateBook = db.transaction((id, mutator) => {

    const current = getBook(id);

    if (!current) {
        throw new Error("Book not found");
    }

    const next = mutator(current);

    updateBook(id, next);

    return next;

});

module.exports = {
    getBook,
    createBook,
    updateBook,
    listBooksForUser,
    mutateBook
};
