const fs = require("fs");
const path = require("path");

function getBookFile(bookId) {
    return path.join(
        __dirname,
        "..",
        "storage",
        "books",
        bookId,
        "book.json"
    );
}

function getBook(bookId) {

    const bookFile = getBookFile(bookId);

    if (!fs.existsSync(bookFile)) {
        throw new Error("Book not found");
    }

    return JSON.parse(
        fs.readFileSync(bookFile, "utf8")
    );
}

function updateBook(bookId, updates) {

    const book = getBook(bookId);

    const updatedBook = {
    ...book,
    ...updates,

    child: {
        ...(book.child || {}),
        ...(updates.child || {})
    },

    characterProfile: {
        ...(book.characterProfile || {}),
        ...(updates.characterProfile || {})
    },

    story: {
        ...(book.story || {}),
        ...(updates.story || {})
    },

    metadata: {
        ...(book.metadata || {}),
        ...(updates.metadata || {})
    },

    updatedAt: new Date().toISOString()
};

    fs.writeFileSync(
        getBookFile(bookId),
        JSON.stringify(updatedBook, null, 2)
    );

    return updatedBook;
}

module.exports = {
    getBook,
    updateBook
};